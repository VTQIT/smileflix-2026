// Utility to scan and manage your movie files
export interface MovieFile {
  name: string;
  path: string;
  size: number;
  modified: Date;
}

// Get all movie files from your movies directory
export async function scanMovieFiles(): Promise<MovieFile[]> {
  // Since you're offline, we'll use a predefined list or scan the folder
  // For now, let's return the list from your directory
  
  const movieFiles = [
    { name: "Black-Widow-2021.mp4", path: "/movies/Black-Widow-2021.mp4", size: 2649683403 },
    { name: "Blue-Beetle-2023.mp4", path: "/movies/Blue-Beetle-2023.mp4", size: 2522241268 },
    { name: "Casino-Royale.mp4", path: "/movies/Casino-Royale.mp4", size: 2252612302 },
    { name: "Chef-2014.mp4", path: "/movies/Chef-2014.mp4", size: 1771919322 },
    { name: "equalizer.mp4", path: "/movies/equalizer.mp4", size: 920840705 },
    { name: "i-robot.mp4", path: "/movies/i-robot.mp4", size: 786910118 },
    { name: "Joker-2019.mp4", path: "/movies/Joker-2019.mp4", size: 2060345341 },
    { name: "Julie-and-Julia.mp4", path: "/movies/Julie-and-Julia.mp4", size: 1775293653 },
    { name: "Just laugh Out Load 2.mp4", path: "/movies/Just laugh Out Load 2.mp4", size: 150844077 },
    { name: "Just laugh Out Load 3.mp4", path: "/movies/Just laugh Out Load 3.mp4", size: 304545785 },
    { name: "Just laugh Out Load 4.mp4", path: "/movies/Just laugh Out Load 4.mp4", size: 174695610 },
    { name: "Just laugh Out Load 5.mp4", path: "/movies/Just laugh Out Load 5.mp4", size: 116447518 },
    { name: "Just laugh Out Load 6.mp4", path: "/movies/Just laugh Out Load 6.mp4", size: 320888521 },
    { name: "Just laugh Out Load.mp4", path: "/movies/Just laugh Out Load.mp4", size: 183345875 },
    { name: "Legend.mp4", path: "/movies/Legend.mp4", size: 1748872354 },
    { name: "Martian.mp4", path: "/movies/Martian.mp4", size: 2326373302 },
    { name: "Moana2.mp4", path: "/movies/Moana2.mp4", size: 7239217344 },
    { name: "Pearl-Harbor.mp4", path: "/movies/Pearl-Harbor.mp4", size: 2989008824 },
    { name: "Pirates.mp4", path: "/movies/Pirates.mp4", size: 2932364631 },
    { name: "Scare01.mp4", path: "/movies/scare01.mp4", size: 11634228 },
    { name: "Scare02.mp4", path: "/movies/scare02.mp4", size: 236251372 },
    { name: "Scare03.mp4", path: "/movies/scare03.mp4", size: 243701179 },
    { name: "Scare04.mp4", path: "/movies/scare04.mp4", size: 178187080 },
    { name: "Scare05.mp4", path: "/movies/scare05.mp4", size: 257776985 },
    { name: "Scare06.mp4", path: "/movies/scare06.mp4", size: 301037128 },
    { name: "Spider-Man-3.mp4", path: "/movies/Spider-Man-3.mp4", size: 2202552518 },
    { name: "Spider-Man-Into-The-Spider-Verse.mp4", path: "/movies/Spider-Man-Into-The-Spider-Verse.mp4", size: 2016133619 },
    { name: "The Peanut Butter Falcon.mkv", path: "/movies/The Peanut Butter Falcon.mkv", size: 1506180231 },
    { name: "The Pursuit Of Happyness.mp4", path: "/movies/The Pursuit Of Happyness.mp4", size: 1613043402 },
    { name: "The Secret Life of Walter Mitty 2013.mp4", path: "/movies/The Secret Life of Walter Mitty 2013.mp4", size: 1917018431 },
    { name: "The Texas Chainsaw Massacre.mp4", path: "/movies/The Texas Chainsaw Massacre.mp4", size: 1644112037 },
    { name: "The-Amazing-Spider-Man-2.mp4", path: "/movies/The-Amazing-Spider-Man-2.mp4", size: 2209039217 },
    { name: "The-Hunger-Games.mp4", path: "/movies/The-Hunger-Games.mp4", size: 2149545864 },
    { name: "The-Intern.mp4", path: "/movies/The-Intern.mp4", size: 1992981583 },
    { name: "The-Longest-Yard.mp4", path: "/movies/The-Longest-Yard.mp4", size: 3858490208 },
    { name: "The-Marvels.mp4", path: "/movies/The-Marvels.mp4", size: 2071378947 },
    { name: "Toy-story-2.mkv", path: "/movies/Toy-story-2.mkv", size: 6250488553 },
    { name: "Toy.mp4", path: "/movies/Toy.mp4", size: 5618032214 },
    { name: "Transformers Age of Extinction.mp4", path: "/movies/Transformers Age of Extinction.mp4", size: 2428767917 },
    { name: "Transformers One.mp4", path: "/movies/Transformers One.mp4", size: 2062755246 },
    { name: "Tucker And Dale Vs Evil.mp4", path: "/movies/Tucker And Dale Vs Evil.mp4", size: 1756944140 },
    { name: "Yes-Man-2008.mp4", path: "/movies/Yes-Man-2008.mp4", size: 2066175814 }
  ];
  
  return movieFiles;
}

// Extract movie title from filename
export function extractMovieTitle(filename: string): string {
  // Remove extension
  let title = filename.replace(/\.[^/.]+$/, "");
  
  // Remove common patterns
  title = title.replace(/\s*\(\d{4}\)\s*/, ""); // Remove (year)
  title = title.replace(/-\d{4}$/, ""); // Remove -2021
  title = title.replace(/\d{4}$/, ""); // Remove year at end
  
  // Replace dashes and underscores with spaces
  title = title.replace(/[-_]/g, " ");
  
  // Clean up extra spaces
  title = title.replace(/\s+/g, " ").trim();
  
  // Handle special cases
  if (title.toLowerCase() === "spider man 3") return "Spider-Man 3";
  if (title.toLowerCase() === "i robot") return "I, Robot";
  if (title.toLowerCase() === "moana2") return "Moana 2";
  if (title.toLowerCase() === "toy") return "Toy Story";
  if (title.toLowerCase() === "toy story 2") return "Toy Story 2";
  if (title.toLowerCase() === "just laugh out load") return "Just Laugh Out Loud";
  
  return title;
}

// Match movie file to metadata
export function matchMovieToMetadata(
  movieFile: MovieFile,
  metadataDb: any
): { match: boolean; metadata: any; confidence: number } {
  const title = extractMovieTitle(movieFile.name);
  const titleLower = title.toLowerCase();
  
  // Try exact match
  if (metadataDb[titleLower]) {
    return { match: true, metadata: metadataDb[titleLower], confidence: 1.0 };
  }
  
  // Try partial match
  const keys = Object.keys(metadataDb);
  for (const key of keys) {
    if (titleLower.includes(key) || key.includes(titleLower)) {
      return { match: true, metadata: metadataDb[key], confidence: 0.8 };
    }
  }
  
  return { match: false, metadata: null, confidence: 0 };
}