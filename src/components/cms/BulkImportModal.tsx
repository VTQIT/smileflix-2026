import { useMemo, useState } from "react";
import { Upload, AlertTriangle, CheckCircle2, X, Sparkles, Download } from "lucide-react";
import Modal from "./Modal";
import { Field, inputCls } from "./FormField";
import {
  Movie,
  Category,
  getMovies,
  setMovies,
  generateId,
  makeUniqueSlug,
} from "@/lib/cms-storage";
import { getArtForTitle } from "@/lib/movie-art";
import { findSimilar } from "@/lib/similarity";
import { toast } from "sonner";

interface ParsedRow {
  title: string;
  description: string;
  /** Category id chosen for this row (overrides round-robin). Empty = use distribution. */
  categoryId: string;
  duplicate?: { title: string; score: number };
  metadata?: MovieMetadata;
}

interface MovieMetadata {
  description: string;
  year: number;
  duration: number;
  rating: number;
  genres: string[];
  cast_list: string[];
  director: string;
  country: string;
  language: string;
  content_rating: string;
  badge: string;
}

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  /** Called after a successful import so parent can refresh its movie list. */
  onImported: (count: number) => void;
}

// Local movie metadata database - completely offline
const LOCAL_METADATA: Record<string, MovieMetadata> = {
  "black widow": {
    description: "Natasha Romanoff confronts the darker parts of her ledger when a dangerous conspiracy with ties to her past arises. Pursued by a force that will stop at nothing to bring her down, she must deal with her history as a spy and the broken relationships left in her wake long before she became an Avenger.",
    year: 2021,
    duration: 134,
    rating: 6.7,
    genres: ["Action", "Adventure", "Sci-Fi"],
    cast_list: ["Scarlett Johansson", "Florence Pugh", "David Harbour", "Rachel Weisz", "Ray Winstone"],
    director: "Cate Shortland",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "She's done running from her past"
  },
  "blue beetle": {
    description: "An alien relic chooses Jaime Reyes to be its symbiotic host, bestowing the teenager with a suit of armor that's capable of extraordinary and unpredictable powers, forever changing his destiny as he becomes the superhero Blue Beetle.",
    year: 2023,
    duration: 127,
    rating: 6.1,
    genres: ["Action", "Adventure", "Sci-Fi", "Comedy"],
    cast_list: ["Xolo Maridueña", "Bruna Marquezine", "Becky G", "George Lopez", "Raoul Max Trujillo"],
    director: "Angel Manuel Soto",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "El escarabajo is here"
  },
  "casino royale": {
    description: "After earning 00 status and a licence to kill, Secret Agent James Bond sets out on his first mission as 007. Bond must defeat a private banker funding terrorists in a high-stakes game of poker at Casino Royale, Montenegro.",
    year: 2006,
    duration: 144,
    rating: 8.0,
    genres: ["Action", "Adventure", "Thriller"],
    cast_list: ["Daniel Craig", "Eva Green", "Mads Mikkelsen", "Judi Dench", "Jeffrey Wright"],
    director: "Martin Campbell",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "Everyone has a price"
  },
  "chef": {
    description: "A head chef quits his restaurant job and buys a food truck in an effort to reclaim his creative promise, while piecing back together his estranged family.",
    year: 2014,
    duration: 114,
    rating: 7.3,
    genres: ["Comedy", "Drama", "Adventure"],
    cast_list: ["Jon Favreau", "Sofia Vergara", "John Leguizamo", "Scarlett Johansson", "Robert Downey Jr."],
    director: "Jon Favreau",
    country: "USA",
    language: "English",
    content_rating: "R",
    badge: "Get your taste back"
  },
  "equalizer": {
    description: "A man who believes he has put his mysterious past behind him cannot stand idly by when he meets a young girl under the control of ultra-violent Russian gangsters.",
    year: 2014,
    duration: 132,
    rating: 7.2,
    genres: ["Action", "Crime", "Thriller"],
    cast_list: ["Denzel Washington", "Marton Csokas", "Chloë Grace Moretz", "David Harbour", "Bill Pullman"],
    director: "Antoine Fuqua",
    country: "USA",
    language: "English",
    content_rating: "R",
    badge: "Vigilante justice"
  },
  "i robot": {
    description: "In 2035, a technophobic detective investigates a crime that may have been perpetrated by a robot, which leads to a larger threat to humanity.",
    year: 2004,
    duration: 115,
    rating: 7.1,
    genres: ["Action", "Sci-Fi", "Thriller"],
    cast_list: ["Will Smith", "Bridget Moynahan", "Bruce Greenwood", "James Cromwell", "Chi McBride"],
    director: "Alex Proyas",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "One man saw the truth"
  },
  "joker": {
    description: "Arthur Fleck, a party clown, leads an impoverished life with his ill mother. However, when society shuns him and brings him down, he decides to embrace a life of chaos and crime.",
    year: 2019,
    duration: 122,
    rating: 8.4,
    genres: ["Crime", "Drama", "Thriller"],
    cast_list: ["Joaquin Phoenix", "Robert De Niro", "Zazie Beetz", "Frances Conroy", "Brett Cullen"],
    director: "Todd Phillips",
    country: "USA",
    language: "English",
    content_rating: "R",
    badge: "Put on a happy face"
  },
  "julie and julia": {
    description: "Julia Child's life and cookbook inspire a young woman in 2002 New York to cook all 524 recipes in one year, blogging about her progress.",
    year: 2009,
    duration: 123,
    rating: 7.0,
    genres: ["Biography", "Drama", "Romance"],
    cast_list: ["Meryl Streep", "Amy Adams", "Stanley Tucci", "Chris Messina", "Linda Emond"],
    director: "Nora Ephron",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "Bon appétit!"
  },
  "legend": {
    description: "Identical twin brothers Reggie and Ronnie Kray, two of the most notorious gangsters in British history, rule the London underworld during the 1960s.",
    year: 2015,
    duration: 132,
    rating: 6.9,
    genres: ["Biography", "Crime", "Drama"],
    cast_list: ["Tom Hardy", "Emily Browning", "Taron Egerton", "Paul Anderson", "Christopher Eccleston"],
    director: "Brian Helgeland",
    country: "UK",
    language: "English",
    content_rating: "R",
    badge: "The Kray twins rule London"
  },
  "martian": {
    description: "An astronaut becomes stranded on Mars after his team assume him dead, and must rely on his ingenuity to find a way to signal to Earth that he is alive and can survive until a potential rescue.",
    year: 2015,
    duration: 144,
    rating: 8.0,
    genres: ["Adventure", "Drama", "Sci-Fi"],
    cast_list: ["Matt Damon", "Jessica Chastain", "Kristen Wiig", "Jeff Daniels", "Michael Peña"],
    director: "Ridley Scott",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "Bring him home"
  },
  "moana": {
    description: "In ancient Polynesia, a young girl embarks on a daring mission to save her people after a curse threatens their island. With the help of the demigod Maui, she must navigate the ocean and restore the heart of Te Fiti.",
    year: 2016,
    duration: 107,
    rating: 7.6,
    genres: ["Animation", "Adventure", "Comedy", "Family"],
    cast_list: ["Auli'i Cravalho", "Dwayne Johnson", "Rachel House", "Temuera Morrison", "Jemaine Clement"],
    director: "Ron Clements, John Musker",
    country: "USA",
    language: "English",
    content_rating: "PG",
    badge: "How far I'll go"
  },
  "pearl harbor": {
    description: "A tale of war and romance in the Pacific during World War II, following two lifelong friends and a beautiful nurse who are caught up in the deadly surprise attack on Pearl Harbor.",
    year: 2001,
    duration: 183,
    rating: 6.2,
    genres: ["Action", "Drama", "History", "Romance"],
    cast_list: ["Ben Affleck", "Josh Hartnett", "Kate Beckinsale", "Cuba Gooding Jr.", "Jon Voight"],
    director: "Michael Bay",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "A day that will live in infamy"
  },
  "pirates": {
    description: "Jack Sparrow, a freewheeling 18th-century pirate, joins forces with Elizabeth Swann and Will Turner to reclaim his beloved ship, the Black Pearl, from his mutinous former first mate.",
    year: 2003,
    duration: 143,
    rating: 8.1,
    genres: ["Action", "Adventure", "Comedy", "Fantasy"],
    cast_list: ["Johnny Depp", "Orlando Bloom", "Keira Knightley", "Geoffrey Rush", "Jack Davenport"],
    director: "Gore Verbinski",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "Dead men tell no tales"
  },
  "spider man 3": {
    description: "Peter Parker has finally managed to strike a balance between his devotion to M.J. and his duties as a superhero. But there is a new villain, and with the return of an old enemy, Peter's life is turned upside down.",
    year: 2007,
    duration: 139,
    rating: 6.3,
    genres: ["Action", "Adventure", "Sci-Fi"],
    cast_list: ["Tobey Maguire", "Kirsten Dunst", "James Franco", "Thomas Haden Church", "Topher Grace"],
    director: "Sam Raimi",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "The greatest battle lies within"
  },
  "spider man into the spider verse": {
    description: "Teen Miles Morales becomes the Spider-Man of his reality, crossing paths with five counterparts from other dimensions to stop a threat for all realities.",
    year: 2018,
    duration: 117,
    rating: 8.4,
    genres: ["Animation", "Action", "Adventure", "Comedy", "Sci-Fi"],
    cast_list: ["Shameik Moore", "Jake Johnson", "Hailee Steinfeld", "Mahershala Ali", "Brian Tyree Henry"],
    director: "Bob Persichetti, Peter Ramsey, Rodney Rothman",
    country: "USA",
    language: "English",
    content_rating: "PG",
    badge: "Anyone can wear the mask"
  },
  "the peanut butter falcon": {
    description: "Zak runs away from a care home to pursue his dream of becoming a professional wrestler. He meets Tyler, a small-time outlaw on the run, and together they go on a journey to find Zak's idol, a salty old fisherman.",
    year: 2019,
    duration: 97,
    rating: 7.6,
    genres: ["Adventure", "Comedy", "Drama"],
    cast_list: ["Zack Gottsagen", "Shia LaBeouf", "Dakota Johnson", "Bruce Dern", "Jon Bernthal"],
    director: "Tyler Nilson, Michael Schwartz",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "An unlikely friendship"
  },
  "the pursuit of happyness": {
    description: "A struggling salesman takes custody of his son as he's poised to begin a life-changing professional endeavor, facing homelessness and despair while never giving up on his dream.",
    year: 2006,
    duration: 117,
    rating: 8.0,
    genres: ["Biography", "Drama"],
    cast_list: ["Will Smith", "Jaden Smith", "Thandie Newton", "Brian Howe", "James Karen"],
    director: "Gabriele Muccino",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "Never let anyone tell you no"
  },
  "the secret life of walter mitty": {
    description: "A day-dreamer escapes his anonymous life by disappearing into a world of fantasies filled with heroism, romance, and action. When his job along with that of his co-worker are threatened, he takes action in the real world embarking on a global journey that turns into an adventure more extraordinary than anything he could have ever imagined.",
    year: 2013,
    duration: 114,
    rating: 7.3,
    genres: ["Adventure", "Comedy", "Drama"],
    cast_list: ["Ben Stiller", "Kristen Wiig", "Adam Scott", "Sean Penn", "Kathryn Hahn"],
    director: "Ben Stiller",
    country: "USA",
    language: "English",
    content_rating: "PG",
    badge: "Stop dreaming, start living"
  },
  "the texas chainsaw massacre": {
    description: "A group of friends traveling through rural Texas fall prey to a family of cannibalistic psychopaths, including the chainsaw-wielding Leatherface.",
    year: 1974,
    duration: 83,
    rating: 7.4,
    genres: ["Horror", "Thriller"],
    cast_list: ["Marilyn Burns", "Edwin Neal", "Allen Danziger", "Paul A. Partain", "Gunnar Hansen"],
    director: "Tobe Hooper",
    country: "USA",
    language: "English",
    content_rating: "R",
    badge: "Who will survive and what will be left of them?"
  },
  "the amazing spider man 2": {
    description: "Peter Parker faces new challenges while trying to maintain his relationship with Gwen Stacy. Meanwhile, a new villain, Electro, emerges, and an old friend returns with a dangerous plan.",
    year: 2014,
    duration: 142,
    rating: 6.6,
    genres: ["Action", "Adventure", "Sci-Fi"],
    cast_list: ["Andrew Garfield", "Emma Stone", "Jamie Foxx", "Dane DeHaan", "Sally Field"],
    director: "Marc Webb",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "The power is in his hands"
  },
  "the hunger games": {
    description: "Katniss Everdeen voluntarily takes her younger sister's place in the Hunger Games, a televised fight to the death in which two teenagers from each of the twelve Districts of Panem are chosen at random to compete.",
    year: 2012,
    duration: 142,
    rating: 7.2,
    genres: ["Action", "Adventure", "Sci-Fi", "Drama"],
    cast_list: ["Jennifer Lawrence", "Josh Hutcherson", "Liam Hemsworth", "Woody Harrelson", "Elizabeth Banks"],
    director: "Gary Ross",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "May the odds be ever in your favor"
  },
  "the intern": {
    description: "A seventy-year-old widower applies to become an intern at an online fashion startup, where he forms an unexpected friendship with the young CEO.",
    year: 2015,
    duration: 121,
    rating: 7.1,
    genres: ["Comedy", "Drama"],
    cast_list: ["Robert De Niro", "Anne Hathaway", "Rene Russo", "Anders Holm", "Andrew Rannells"],
    director: "Nancy Meyers",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "Experience never gets old"
  },
  "the longest yard": {
    description: "A former NFL quarterback serving time in prison is forced to lead his fellow inmates in a football game against the prison guards.",
    year: 2005,
    duration: 113,
    rating: 6.4,
    genres: ["Comedy", "Crime", "Sport"],
    cast_list: ["Adam Sandler", "Chris Rock", "James Cromwell", "Nelly", "Burt Reynolds"],
    director: "Peter Segal",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "The inmates are taking over"
  },
  "the marvels": {
    description: "Carol Danvers, Monica Rambeau, and Kamala Khan must work together to save the universe when their powers become entangled and they swap places every time they use them.",
    year: 2023,
    duration: 105,
    rating: 5.5,
    genres: ["Action", "Adventure", "Sci-Fi"],
    cast_list: ["Brie Larson", "Teyonah Parris", "Iman Vellani", "Samuel L. Jackson", "Zawe Ashton"],
    director: "Nia DaCosta",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "Higher, further, faster together"
  },
  "toy story 2": {
    description: "When Woody is stolen by a toy collector, Buzz and his friends embark on a daring rescue mission to save him before he is shipped to a museum in Japan.",
    year: 1999,
    duration: 92,
    rating: 7.9,
    genres: ["Animation", "Adventure", "Comedy", "Family"],
    cast_list: ["Tom Hanks", "Tim Allen", "Joan Cusack", "Kelsey Grammer", "Don Rickles"],
    director: "John Lasseter",
    country: "USA",
    language: "English",
    content_rating: "G",
    badge: "The toys are back in town"
  },
  "toy story": {
    description: "A cowboy doll is deeply threatened and jealous when a new spaceman figure supplants him as top toy in a boy's room.",
    year: 1995,
    duration: 81,
    rating: 8.3,
    genres: ["Animation", "Adventure", "Comedy", "Family"],
    cast_list: ["Tom Hanks", "Tim Allen", "Don Rickles", "Jim Varney", "Wallace Shawn"],
    director: "John Lasseter",
    country: "USA",
    language: "English",
    content_rating: "G",
    badge: "To infinity and beyond!"
  },
  "transformers age of extinction": {
    description: "When humanity allies with a bounty hunter in pursuit of Optimus Prime, the Autobots turn to a mechanic and his daughter for help.",
    year: 2014,
    duration: 165,
    rating: 5.6,
    genres: ["Action", "Adventure", "Sci-Fi"],
    cast_list: ["Mark Wahlberg", "Stanley Tucci", "Kelsey Grammer", "Nicola Peltz", "Jack Reynor"],
    director: "Michael Bay",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "The hunt is on"
  },
  "transformers one": {
    description: "The untold origin story of Optimus Prime and Megatron, who were once brothers-in-arms but became sworn enemies and changed the fate of Cybertron forever.",
    year: 2024,
    duration: 104,
    rating: 7.6,
    genres: ["Animation", "Action", "Adventure", "Sci-Fi"],
    cast_list: ["Chris Hemsworth", "Brian Tyree Henry", "Scarlett Johansson", "Keegan-Michael Key", "Steve Buscemi"],
    director: "Josh Cooley",
    country: "USA",
    language: "English",
    content_rating: "PG",
    badge: "Every hero has a beginning"
  },
  "tucker and dale vs evil": {
    description: "Two well-meaning hillbillies are mistaken for killers by a group of college students, leading to a hilarious series of misunderstandings and accidents.",
    year: 2010,
    duration: 89,
    rating: 7.5,
    genres: ["Comedy", "Horror"],
    cast_list: ["Tyler Labine", "Alan Tudyk", "Katrina Bowden", "Jesse Moss", "Philip Granger"],
    director: "Eli Craig",
    country: "USA",
    language: "English",
    content_rating: "R",
    badge: "Sometimes evil just needs a little help"
  },
  "yes man": {
    description: "A man who has been avoiding life's responsibilities is challenged to say 'yes' to every opportunity that comes his way, transforming his life in unexpected ways.",
    year: 2008,
    duration: 104,
    rating: 6.8,
    genres: ["Comedy", "Romance"],
    cast_list: ["Jim Carrey", "Zooey Deschanel", "Bradley Cooper", "John Michael Higgins", "Rhys Darby"],
    director: "Peyton Reed",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "The word is YES"
  },
  "just laugh out load": {
    description: "A hilarious comedy that brings laughter and joy through a series of side-splitting situations and unforgettable characters.",
    year: 2024,
    duration: 85,
    rating: 6.0,
    genres: ["Comedy"],
    cast_list: ["Comedy Ensemble", "Various Artists"],
    director: "Comedy Director",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: "Get ready to laugh"
  },
  "scare": {
    description: "A thrilling horror experience that will keep you on the edge of your seat with unexpected twists and terrifying moments.",
    year: 2024,
    duration: 75,
    rating: 5.5,
    genres: ["Horror", "Thriller"],
    cast_list: ["Horror Ensemble"],
    director: "Horror Director",
    country: "USA",
    language: "English",
    content_rating: "R",
    badge: "Fear comes alive"
  }
};

// Sample video URL
const SAMPLE_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

/**
 * Parse pasted text. Supports two formats per line, auto-detected:
 *   1. "Title — Description"   (em dash, en dash, or " | ", " - ", ": ")
 *   2. "Title,Description"     (CSV — first comma splits)
 * Lines without a separator are imported with an empty description.
 * Blank lines and lines starting with "#" are skipped.
 */
function parseInput(raw: string, defaultDescription: string): Omit<ParsedRow, "categoryId" | "duplicate" | "metadata">[] {
  const out: Omit<ParsedRow, "categoryId" | "duplicate" | "metadata">[] = [];
  const SEPARATORS = [" — ", " – ", " | ", " :: ", " - "];
  const lines = raw.split(/\r?\n/);
  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    // Skip a CSV header row if present on the very first non-blank line
    if (
      out.length === 0 &&
      /^\s*"?title"?\s*,\s*"?description"?\s*$/i.test(line)
    ) {
      continue;
    }
    let title = line;
    let desc = "";
    let split = false;
    for (const sep of SEPARATORS) {
      const i = line.indexOf(sep);
      if (i > 0) {
        title = line.slice(0, i).trim();
        desc = line.slice(i + sep.length).trim();
        split = true;
        break;
      }
    }
    if (!split) {
      const i = line.indexOf(",");
      if (i > 0) {
        title = line.slice(0, i).trim().replace(/^"|"$/g, "");
        desc = line.slice(i + 1).trim().replace(/^"|"$/g, "");
      }
    }
    title = title.replace(/^["'\u201C\u201D]|["'\u201C\u201D]$/g, "").trim();
    if (!title) continue;
    out.push({ title, description: desc || defaultDescription });
  }
  return out;
}

/**
 * Extract movie title from filename or title string
 */
function extractMovieTitle(title: string): string {
  // Remove file extension
  let clean = title.replace(/\.[^/.]+$/, "");
  
  // Remove common patterns
  clean = clean.replace(/\s*\(\d{4}\)\s*/, ""); // Remove (year)
  clean = clean.replace(/-\d{4}$/, ""); // Remove -2021
  clean = clean.replace(/\d{4}$/, ""); // Remove year at end
  
  // Replace dashes and underscores with spaces
  clean = clean.replace(/[-_]/g, " ");
  
  // Clean up extra spaces
  clean = clean.replace(/\s+/g, " ").trim();
  
  // Handle special cases
  if (clean.toLowerCase() === "spider man 3") return "Spider-Man 3";
  if (clean.toLowerCase() === "i robot") return "I, Robot";
  if (clean.toLowerCase() === "moana2") return "Moana 2";
  if (clean.toLowerCase() === "toy") return "Toy Story";
  if (clean.toLowerCase() === "toy story 2") return "Toy Story 2";
  if (clean.toLowerCase() === "just laugh out load") return "Just Laugh Out Load";
  
  return clean;
}

/**
 * Get metadata for a movie from local database
 */
function getLocalMetadata(title: string): MovieMetadata | null {
  const normalizedTitle = title.toLowerCase().trim();
  
  // Try exact match
  if (LOCAL_METADATA[normalizedTitle]) {
    return LOCAL_METADATA[normalizedTitle];
  }
  
  // Try partial match
  const keys = Object.keys(LOCAL_METADATA);
  for (const key of keys) {
    if (normalizedTitle.includes(key) || key.includes(normalizedTitle)) {
      return LOCAL_METADATA[key];
    }
  }
  
  return null;
}

/**
 * Generate fallback metadata when movie not found
 */
function generateFallbackMetadata(title: string): MovieMetadata {
  return {
    description: `${title} is an engaging film that captivates audiences with its compelling storyline and remarkable performances.`,
    year: new Date().getFullYear(),
    duration: 120,
    rating: 7.0,
    genres: ["Drama"],
    cast_list: ["Main Actor", "Supporting Actor"],
    director: "Director Name",
    country: "USA",
    language: "English",
    content_rating: "PG-13",
    badge: `${title} - A must watch!`
  };
}

export default function BulkImportModal({ open, onClose, categories, onImported }: BulkImportModalProps) {
  const [text, setText] = useState("");
  const [defaultDescription, setDefaultDescription] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [showMetadataPreview, setShowMetadataPreview] = useState(true);
  const [overrides, setOverrides] = useState<Record<number, string>>({});

  const importableCats = useMemo(
    () => categories.filter((c) => !c.virtual).sort((a, b) => a.order - b.order),
    [categories],
  );

  const reset = () => {
    setText("");
    setDefaultDescription("");
    setSelectedCats([]);
    setPublishImmediately(true);
    setSkipDuplicates(true);
    setShowMetadataPreview(true);
    setOverrides({});
  };

  const close = () => { reset(); onClose(); };

  const downloadTemplate = () => {
    const csv =
      "Title,Description\n" +
      "\"Oppenheimer\",\"A biopic of the man behind the atomic bomb.\"\n" +
      "\"Dune: Part Two\",\"Paul Atreides unites with the Fremen.\"\n" +
      "\"Wednesday\",\"A young Addams enrolls at Nevermore Academy.\"\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "smileflex-bulk-import-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const parsedRaw = useMemo(() => parseInput(text, defaultDescription), [text, defaultDescription]);

  const rows = useMemo<ParsedRow[]>(() => {
    const existing = getMovies();
    return parsedRaw.map((r, i) => {
      const auto = selectedCats.length
        ? selectedCats[i % selectedCats.length]
        : "";
      const categoryId = overrides[i] ?? auto;
      const matches = findSimilar(r.title, existing, { threshold: 0.85, limit: 1 });
      const dup = matches[0]
        ? { title: matches[0].item.title, score: matches[0].score }
        : undefined;
      
      // Get metadata from local database
      const cleanTitle = extractMovieTitle(r.title);
      let metadata = getLocalMetadata(cleanTitle);
      if (!metadata) {
        metadata = generateFallbackMetadata(cleanTitle);
      }
      
      return { ...r, categoryId, duplicate: dup, metadata };
    });
  }, [parsedRaw, selectedCats, overrides]);

  const dupCount = rows.filter((r) => r.duplicate).length;
  const missingCatCount = rows.filter((r) => !r.categoryId).length;
  const importableCount = rows.length - (skipDuplicates ? dupCount : 0) - missingCatCount;

  const toggleCat = (id: string) =>
    setSelectedCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const setRowCategory = (index: number, categoryId: string) =>
    setOverrides((prev) => ({ ...prev, [index]: categoryId }));

  const runImport = () => {
    if (!rows.length) return toast.error("Nothing to import — paste some titles first");
    if (selectedCats.length === 0 && rows.every((r) => !r.categoryId)) {
      return toast.error("Pick at least one target category");
    }

    const existing = getMovies();
    const next: Movie[] = [...existing];
    const now = new Date().toISOString();
    let added = 0;
    let skipped = 0;
    let metadataFound = 0;

    for (const r of rows) {
      if (!r.categoryId) { skipped++; continue; }
      if (skipDuplicates && r.duplicate) { skipped++; continue; }
      
      const id = generateId();
      const slug = makeUniqueSlug(r.title, next);
      const art = getArtForTitle(r.title);
      
      // Use metadata from local database
      const meta = r.metadata || generateFallbackMetadata(r.title);
      if (r.metadata) metadataFound++;
      
      const movie: Movie = {
        id,
        title: r.title,
        slug,
        description: r.description || meta.description,
        poster: art.poster,
        backdrop: art.backdrop,
        video: SAMPLE_VIDEO,
        duration: meta.duration || 90,
        categoryId: r.categoryId,
        published: publishImmediately,
        ads: [],
        createdAt: now,
        year: meta.year || new Date().getFullYear(),
        rating: meta.rating || 0,
        featured: false,
        badge: meta.badge || "",
        // Add metadata fields for display
        genres: meta.genres || [],
        cast_list: meta.cast_list || [],
        director: meta.director || "",
        country: meta.country || "",
        language: meta.language || "",
        content_rating: meta.content_rating || "",
      };
      
      next.push(movie);
      added++;
    }

    setMovies(next);
    try {
      window.dispatchEvent(new StorageEvent("storage", { key: "smileflex_movies" }));
    } catch {
      window.dispatchEvent(new Event("storage"));
    }

    toast.success(
      `Imported ${added} movie${added === 1 ? "" : "s"}` +
        ` (${metadataFound} with full metadata)` +
        (skipped ? ` · ${skipped} skipped` : ""),
    );
    onImported(added);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Bulk Import Movies"
      maxWidth="max-w-4xl"
      footer={
        <>
          <button onClick={close} className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/70 font-medium transition-colors">
            Cancel
          </button>
          <button
            onClick={runImport}
            disabled={importableCount <= 0}
            className="px-5 py-2.5 rounded-xl gradient-brand text-primary-foreground font-semibold flex items-center gap-2 hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            <Upload className="w-4 h-4" /> Import {importableCount > 0 ? importableCount : ""}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Step 1 — paste */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">
              Paste titles{" "}
              <span className="text-muted-foreground font-normal">
                (one per line — supports <code className="text-xs">Title — Description</code> or CSV)
              </span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={downloadTemplate}
                className="text-xs flex items-center gap-1 text-primary-glow hover:text-primary transition-colors"
                title="Download a CSV template you can fill in and paste back here"
              >
                <Download className="w-3 h-3" /> CSV template
              </button>
              <span className="text-xs text-muted-foreground">{parsedRaw.length} parsed</span>
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setOverrides({}); }}
            rows={8}
            placeholder={`Oppenheimer — A biopic of the man behind the atomic bomb.\nDune: Part Two — Paul Atreides unites with the Fremen.\nWednesday, A young Addams enrolls at Nevermore Academy.\n# Lines starting with # are ignored`}
            className={`${inputCls} font-mono text-sm leading-relaxed`}
            spellCheck={false}
          />
        </div>

        <Field label="Default description (used when a row has no description)">
          <input
            className={inputCls}
            value={defaultDescription}
            onChange={(e) => setDefaultDescription(e.target.value)}
            placeholder="A new release on SmileFlex."
            maxLength={500}
          />
        </Field>

        {/* Step 2 — categories */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">
              Target categories{" "}
              <span className="text-muted-foreground font-normal">
                (pick one or many — titles are distributed round-robin)
              </span>
            </label>
            {selectedCats.length > 0 && (
              <button
                onClick={() => { setSelectedCats([]); setOverrides({}); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
          {importableCats.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 rounded-lg bg-secondary/30 border border-border">
              No static categories available. Create one in Categories first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 rounded-xl bg-secondary/30 border border-border">
              {importableCats.map((c) => {
                const on = selectedCats.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { toggleCat(c.id); setOverrides({}); }}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                      on
                        ? "bg-primary/20 text-primary-glow border-primary/50"
                        : "bg-background/40 text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border cursor-pointer">
            <input
              type="checkbox"
              checked={publishImmediately}
              onChange={(e) => setPublishImmediately(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-primary"
            />
            <div>
              <div className="text-sm font-medium">Publish immediately</div>
              <div className="text-xs text-muted-foreground">If off, imports start as drafts.</div>
            </div>
          </label>
          <label className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border cursor-pointer">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-primary"
            />
            <div>
              <div className="text-sm font-medium">Skip likely duplicates</div>
              <div className="text-xs text-muted-foreground">Rows that look 85%+ similar to existing titles.</div>
            </div>
          </label>
        </div>

        {/* Metadata Preview Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowMetadataPreview(!showMetadataPreview)}
            className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showMetadataPreview ? "Hide" : "Show"} metadata preview
          </button>
        </div>

        {/* Preview */}
        {rows.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Preview</h3>
              <div className="text-xs text-muted-foreground flex items-center gap-3">
                <span className="flex items-center gap-1 text-success"><CheckCircle2 className="w-3 h-3" /> {importableCount} ready</span>
                {dupCount > 0 && <span className="flex items-center gap-1 text-warning"><AlertTriangle className="w-3 h-3" /> {dupCount} duplicate</span>}
                {missingCatCount > 0 && <span className="flex items-center gap-1 text-destructive"><X className="w-3 h-3" /> {missingCatCount} no category</span>}
              </div>
            </div>
            <div className="rounded-xl border border-border overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs text-muted-foreground sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium w-8">#</th>
                    <th className="px-3 py-2 text-left font-medium">Title / Metadata</th>
                    <th className="px-3 py-2 text-left font-medium">Category</th>
                    <th className="px-3 py-2 text-left font-medium w-32">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const skipped = (skipDuplicates && r.duplicate) || !r.categoryId;
                    const hasMetadata = r.metadata && r.metadata.year > 0;
                    return (
                      <tr key={i} className={`border-t border-border ${skipped ? "opacity-60" : ""}`}>
                        <td className="px-3 py-2 text-muted-foreground tabular-nums">{i + 1}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium truncate max-w-[260px]">{r.title}</div>
                          {showMetadataPreview && r.metadata && (
                            <div className="text-xs text-muted-foreground truncate max-w-[260px]">
                              {r.metadata.year} · {r.metadata.genres.join(", ")} · ⭐ {r.metadata.rating}
                              {hasMetadata && (
                                <span className="ml-1 text-success">✓</span>
                              )}
                            </div>
                          )}
                          {r.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[260px] opacity-70">
                              {r.description}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={r.categoryId}
                            onChange={(e) => setRowCategory(i, e.target.value)}
                            className="text-xs px-2 py-1 rounded bg-background border border-border focus:border-primary focus:outline-none max-w-[180px]"
                          >
                            <option value="">— pick —</option>
                            {importableCats.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          {!r.categoryId ? (
                            <span className="text-xs text-destructive flex items-center gap-1">
                              <X className="w-3 h-3" /> No category
                            </span>
                          ) : r.duplicate ? (
                            <span
                              className="text-xs text-warning flex items-center gap-1"
                              title={`Looks like "${r.duplicate.title}" (${Math.round(r.duplicate.score * 100)}%)`}
                            >
                              <AlertTriangle className="w-3 h-3" /> {skipDuplicates ? "Will skip" : "Duplicate"}
                            </span>
                          ) : (
                            <span className="text-xs text-success flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}