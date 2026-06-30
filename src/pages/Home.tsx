// src/pages/Home.tsx

import { useEffect, useMemo, useRef, useState, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import { Play, Info, Search, Bell, Star, Settings, Heart, GripVertical, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Movie,
  Category,
  getMovies,
  getCategories,
  getPlayCounts,
  getLastPlayed,
  incrementPlayCount,
  rankTopTen,
  fetchMovies,
  fetchCategories,
  incrementPlayCountAsync,
} from "@/lib/cms-storage";
import {
  RailSettings,
  getCachedRailSettings,
  fetchRailSettings,
} from "@/lib/rail-settings";
import {
  getFavorites,
  toggleFavorite,
  reorderFavorites,
  onFavoritesChange,
} from "@/lib/favorites";
import { getFallbackArtForTitle } from "@/lib/movie-art";
import { resolveMediaUrl } from "@/lib/media-source";
import {
  applyRailOrder,
  getRailOrder,
  onRailOrderChange,
  setRailOrder,
} from "@/lib/rail-order";
import { SortableRail, DragHandleProps } from "@/components/home/SortableRail";
import introVideo from "@/assets/intro.mp4";
import Logo from "@/components/Logo";
import SearchOverlay from "@/components/home/SearchOverlay";
import PlayerModal from "@/components/PlayerModal";

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

interface IntroOverlayProps {
  onDone: () => void;
}

const IntroOverlay = memo(({ onDone }: IntroOverlayProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [skippable, setSkippable] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSkippable(true), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[2000] bg-black flex items-center justify-center">
      <video
        ref={ref}
        src={introVideo}
        autoPlay
        muted
        playsInline
        onEnded={onDone}
        className="md:hidden w-full h-full object-contain"
      />
      <video
        src={introVideo}
        autoPlay
        muted
        playsInline
        onEnded={onDone}
        className="hidden md:block w-full h-full object-cover"
        style={{ aspectRatio: "16 / 9" }}
      />
      {skippable && (
        <button
          onClick={onDone}
          className="absolute bottom-6 right-6 bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded backdrop-blur"
        >
          Skip Intro ▶
        </button>
      )}
    </div>
  );
});

IntroOverlay.displayName = "IntroOverlay";

interface CardProps {
  movie: Movie;
  onPlay: () => void;
  isFav: boolean;
  onToggleFav: () => void;
  dragHandle?: DragHandleProps;
  style?: React.CSSProperties;
}

const Card = memo(({ movie, onPlay, isFav, onToggleFav, dragHandle, style }: CardProps) => {
  const fallback = useMemo(() => getFallbackArtForTitle(movie.title).poster, [movie.title]);
  const posterSrc = useMemo(() => (movie.poster ? resolveMediaUrl(movie.poster) : ""), [movie.poster]);
  const insertionSide = dragHandle?.insertionSide ?? null;

  return (
    <div
      ref={dragHandle?.ref}
      style={style}
      className={cn(
        "group flex-none w-[160px] sm:w-[200px] md:w-[220px] rounded-lg bg-[#1f1f1f] text-left transition-transform duration-200 hover:scale-[1.06] hover:z-10 hover:shadow-[0_10px_30px_rgba(0,0,0,0.6)] relative",
        dragHandle?.isOver ? "ring-2 ring-[#FFD700]" : ""
      )}
      {...(dragHandle?.attributes ?? {})}
    >
      {insertionSide && (
        <span
          aria-hidden
          className={"pointer-events-none absolute top-0 bottom-0 w-1 rounded-full bg-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.95)] animate-pulse z-30 " + (insertionSide === "left" ? "-left-2" : "-right-2")}
        />
      )}
      <button
        type="button"
        onClick={onPlay}
        className="block w-full text-left"
        aria-label={"Play " + movie.title}
      >
        <div className="relative aspect-[2/3] bg-[#2a2a2a]">
          {posterSrc ? (
            <img
              src={posterSrc}
              alt={movie.title}
              loading="lazy"
              onError={(e) => {
                const img = e.currentTarget;
                if (img.src !== fallback) img.src = fallback;
              }}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={fallback}
              alt={movie.title}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          )}
          {movie.rating ? (
            <span className="absolute top-2 left-2 bg-black/70 text-[#FFD700] text-xs px-2 py-1 rounded flex items-center gap-1">
              <Star className="w-3 h-3 fill-[#FFD700]" />
              {movie.rating.toFixed(1)}
            </span>
          ) : null}
          <span className="absolute left-1/2 -translate-x-1/2 bottom-16 w-10 h-10 rounded-full bg-[#FFD700] text-[#141414] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
            <Play className="w-5 h-5 fill-[#141414]" />
          </span>
        </div>
        <div className="p-3 flex items-center justify-between">
          <span className="text-sm text-white truncate max-w-[140px]">{movie.title}</span>
          {movie.year ? <span className="text-xs text-white/60">{movie.year}</span> : null}
        </div>
      </button>
      {dragHandle && (
        <button
          type="button"
          {...(dragHandle.listeners ?? {})}
          aria-label={"Drag " + movie.title + " to reorder"}
          title="Drag to reorder"
          className="absolute bottom-14 left-2 w-9 h-9 rounded-full flex items-center justify-center bg-black/70 hover:bg-black/90 text-white backdrop-blur-sm cursor-grab active:cursor-grabbing touch-none z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shadow-md ring-1 ring-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFav();
        }}
        aria-label={isFav ? "Remove " + movie.title + " from favorites" : "Add " + movie.title + " to favorites"}
        aria-pressed={isFav}
        className={cn(
          "absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors z-10",
          isFav ? "bg-[#E50914] text-white hover:bg-[#E50914]/90" : "bg-black/60 text-white hover:bg-black/80"
        )}
      >
        <Heart className={"w-4 h-4 " + (isFav ? "fill-white" : "")} />
      </button>
    </div>
  );
});

Card.displayName = "Card";

interface HeroVideoProps {
  videoUrl: string;
  posterUrl: string;
  onReady: () => void;
  onError: () => void;
  isReady: boolean;
  hasFailed: boolean;
}

const HeroVideo = memo(({ videoUrl, posterUrl, onReady, onError, isReady, hasFailed }: HeroVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      video.play().then(() => onReady()).catch(() => onError());
    };

    video.addEventListener("canplay", handleCanPlay);
    video.load();

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [videoUrl, onReady, onError]);

  if (hasFailed) return null;

  return (
    <video
      ref={videoRef}
      poster={posterUrl}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      onPlaying={onReady}
      onError={onError}
      className={"absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 " + (isReady ? "opacity-100" : "opacity-0")}
    >
      <source src={videoUrl} type="video/mp4" />
    </video>
  );
});

HeroVideo.displayName = "HeroVideo";

interface HeroProps {
  movies: Movie[];
  onPlay: (movie: Movie) => void;
}

const Hero = memo(({ movies, onPlay }: HeroProps) => {
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);
  const [heroPaused, setHeroPaused] = useState(false);

  const heroMovies = useMemo(() => {
    if (movies.length === 0) return [];
    const featured = movies.filter((m) => m.featured);
    const pool = featured.length > 0 ? featured : [...movies];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  }, [movies]);

  const hero = heroMovies[heroIndex];

  useEffect(() => {
    setHeroVideoReady(false);
    setHeroVideoFailed(false);
  }, [heroIndex]);

  useEffect(() => {
    if (heroPaused || heroMovies.length <= 1) return;
    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroMovies.length);
    }, 8000);
    return () => clearInterval(t);
  }, [heroPaused, heroMovies.length]);

  const goHeroPrev = useCallback(() => {
    setHeroIndex((i) => (i - 1 + heroMovies.length) % heroMovies.length);
  }, [heroMovies.length]);

  const goHeroNext = useCallback(() => {
    setHeroIndex((i) => (i + 1) % heroMovies.length);
  }, [heroMovies.length]);

  if (!hero || heroMovies.length === 0) return null;

  const posterUrl = hero.backdrop ? resolveMediaUrl(hero.backdrop) : (hero.poster ? resolveMediaUrl(hero.poster) : "");
  const videoUrl = hero.video ? resolveMediaUrl(hero.video) : "";

  return (
    <section
      className="relative h-[85vh] min-h-[500px] flex items-center px-[4%] overflow-hidden group/hero"
      onMouseEnter={() => setHeroPaused(true)}
      onMouseLeave={() => setHeroPaused(false)}
      onFocusCapture={() => setHeroPaused(true)}
      onBlurCapture={() => setHeroPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured movie previews"
    >
      {posterUrl && (
        <img
          src={posterUrl}
          alt=""
          aria-hidden
          className={"absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 " + (heroVideoReady && !heroVideoFailed ? "opacity-0" : "opacity-100")}
        />
      )}

      {videoUrl && (
        <HeroVideo
          videoUrl={videoUrl}
          posterUrl={posterUrl}
          onReady={() => setHeroVideoReady(true)}
          onError={() => setHeroVideoFailed(true)}
          isReady={heroVideoReady}
          hasFailed={heroVideoFailed}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#141414] to-transparent" />

      <div className="relative max-w-xl mt-16">
        {hero.badge && (
          <span className="inline-block bg-[#FFD700] text-[#141414] font-bold px-4 py-1 rounded-full text-sm mb-4">
            {hero.badge}
          </span>
        )}
        <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">{hero.title}</h1>
        <p className="text-base md:text-lg text-white/90 mb-6 drop-shadow">
          {hero.description}
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => onPlay(hero)}
            className="px-6 py-3 rounded bg-white text-[#141414] font-semibold flex items-center gap-2 hover:bg-white/80 transition"
          >
            <Play className="w-5 h-5 fill-[#141414]" /> Play
          </button>
          <button className="px-6 py-3 rounded bg-white/20 text-white font-semibold flex items-center gap-2 hover:bg-white/10 transition">
            <Info className="w-5 h-5" /> More Info
          </button>
        </div>
      </div>

      {heroMovies.length > 1 && (
        <>
          <button
            type="button"
            onClick={goHeroPrev}
            aria-label="Previous featured movie"
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition opacity-0 group-hover/hero:opacity-100 focus-visible:opacity-100 z-20 ring-1 ring-white/10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={goHeroNext}
            aria-label="Next featured movie"
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition opacity-0 group-hover/hero:opacity-100 focus-visible:opacity-100 z-20 ring-1 ring-white/10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div
            role="tablist"
            aria-label="Choose featured movie"
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 px-3 py-2 rounded-full bg-black/40 backdrop-blur-sm"
          >
            {heroMovies.map((m, i) => {
              const active = i === heroIndex;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={"Show " + m.title}
                  onClick={() => setHeroIndex(i)}
                  className={active ? "w-6 h-2 bg-[#FFD700] rounded-full transition-all" : "w-2 h-2 bg-white/40 hover:bg-white/70 rounded-full transition-all"}
                />
              );
            })}
          </div>
        </>
      )}
    </section>
  );
});

Hero.displayName = "Hero";

interface NavbarProps {
  scrolled: boolean;
  onSearchOpen: () => void;
}

const Navbar = memo(({ scrolled, onSearchOpen }: NavbarProps) => {
  return (
    <header
      className={"fixed top-0 left-0 right-0 z-40 px-[4%] py-4 flex items-center justify-between transition-colors " + (scrolled ? "bg-[#141414]" : "bg-gradient-to-b from-black/80 to-transparent")}
    >
      <div className="flex items-center gap-8">
        <a href="/" className="flex items-center" aria-label="SmileFlex home">
          <Logo className="h-7 md:h-8 w-auto select-none" />
        </a>
        <nav className="hidden md:flex gap-6 text-sm text-[#e5e5e5]">
          <a href="#" className="hover:text-[#FFD700] text-[#FFD700]">Home</a>
          <a href="#" className="hover:text-[#FFD700]">TV Shows</a>
          <a href="#" className="hover:text-[#FFD700]">Movies</a>
          <a href="#" className="hover:text-[#FFD700]">New & Popular</a>
          <a href="#" className="hover:text-[#FFD700]">My List</a>
        </nav>
      </div>
      <div className="flex items-center gap-5 text-white">
        <button
          type="button"
          onClick={onSearchOpen}
          aria-label="Search movies"
          className="hover:text-[#FFD700] transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>
        <Bell className="w-5 h-5 cursor-pointer hover:text-[#FFD700]" />
        <Link
          to="/favorites"
          aria-label="My Favorites"
          className="inline-flex items-center gap-2 text-xs px-2 sm:px-3 py-1.5 rounded bg-white/10 hover:bg-[#E50914] hover:text-white transition"
        >
          <Heart className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">Favorites</span>
        </Link>
        <Link
          to="/cms/movies"
          aria-label="Open CMS"
          className="inline-flex items-center gap-2 text-xs px-2 sm:px-3 py-1.5 rounded bg-white/10 hover:bg-[#FFD700] hover:text-[#141414] transition"
        >
          <Settings className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">CMS</span>
        </Link>
      </div>
    </header>
  );
});

Navbar.displayName = "Navbar";

function useCmsData() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
  const [lastPlayed, setLastPlayed] = useState<Record<string, number>>({});
  const [railSettings, setRailSettings] = useState<RailSettings>(getCachedRailSettings);
  const [favorites, setFavorites] = useState<string[]>(getFavorites);
  const [orderTick, setOrderTick] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const allMovies = await fetchMovies();
        setMovies(allMovies.filter((m) => m.published));
        
        const cats = await fetchCategories();
        setCategories([...cats].sort((a, b) => a.order - b.order));
        
        setPlayCounts(getPlayCounts());
        setLastPlayed(getLastPlayed());
        setFavorites(getFavorites());
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to localStorage
        const allMovies = getMovies();
        setMovies(allMovies.filter((m) => m.published));
        setCategories([...getCategories()].sort((a, b) => a.order - b.order));
        setPlayCounts(getPlayCounts());
        setLastPlayed(getLastPlayed());
        setFavorites(getFavorites());
      } finally {
        setLoading(false);
      }
    };
    load();

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("smileflex_")) {
        load();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", load);

    const offFav = onFavoritesChange(() => setFavorites(getFavorites()));
    const offOrder = onRailOrderChange(() => setOrderTick((t) => t + 1));

    fetchRailSettings().then(setRailSettings).catch(() => {/* ignore */});

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", load);
      offFav();
      offOrder();
    };
  }, []);

  return { movies, categories, playCounts, lastPlayed, railSettings, favorites, orderTick, loading };
}

export default function Home() {
  const { movies, categories, playCounts, lastPlayed, railSettings, favorites, orderTick, loading } = useCmsData();
  const [playing, setPlaying] = useState<Movie | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("smileflex_intro_played");
  });

  const dismissIntro = useCallback(() => {
    sessionStorage.setItem("smileflex_intro_played", "1");
    setShowIntro(false);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const favSet = useMemo(() => new Set(favorites), [favorites]);

  const playMovie = useCallback(async (m: Movie) => {
    try {
      await incrementPlayCountAsync(m.id);
    } catch (error) {
      console.warn('Failed to increment play count:', error);
      incrementPlayCount(m.id);
    }
    setPlaying(m);
  }, []);

  const moviesByCategory = useMemo(() => {
    const map = new Map<string, Movie[]>();
    for (const c of categories) map.set(c.id, []);
    for (const m of movies) {
      const arr = map.get(m.categoryId);
      if (arr) arr.push(m);
    }
    return map;
  }, [movies, categories]);

  const renderRows = useCallback(() => {
    void orderTick;
    const seen = new Set<string>();
    const result: React.ReactNode[] = [];

    for (const cat of categories) {
      let list: Movie[];
      if (cat.virtual && cat.slug === "favorites") {
        const byId = new Map(movies.map((m) => [m.id, m]));
        list = favorites.map((id) => byId.get(id)).filter(Boolean) as Movie[];
      } else if (cat.virtual && cat.topTen) {
        list = rankTopTen(10);
      } else if (cat.virtual && cat.slug === "continue") {
        const played = movies.filter((m) => (playCounts[m.id] || 0) > 0);
        list = (
          railSettings.continueSort === "most_played"
            ? played.sort((a, b) => (playCounts[b.id] || 0) - (playCounts[a.id] || 0))
            : played.sort((a, b) => (lastPlayed[b.id] || 0) - (lastPlayed[a.id] || 0))
        ).slice(0, railSettings.continueMaxItems);
      } else {
        list = moviesByCategory.get(cat.id) || [];
      }

      const isPriorityRail = (cat.virtual && cat.slug === "favorites") || cat.topTen;
      if (!isPriorityRail) {
        list = list.filter((m) => !seen.has(m.id));
      }
      list.forEach((m) => seen.add(m.id));

      if (list.length === 0) continue;

      const railKey = cat.id;
      const isFavoritesRail = cat.virtual && cat.slug === "favorites";
      if (!isFavoritesRail) {
        list = applyRailOrder(list, getRailOrder(railKey));
      }

      const handleReorder = (newIds: string[]) => {
        if (isFavoritesRail) reorderFavorites(newIds);
        else setRailOrder(railKey, newIds);
      };

      if (cat.topTen) {
        result.push(
          <div key={cat.id} className="mb-10">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-xl md:text-2xl font-semibold">{cat.name}</h2>
              <span className="text-xs text-white/50 uppercase tracking-wider">Updated weekly</span>
            </div>
            <SortableRail
              items={list.map((m, idx) => ({ m, idx }))}
              getId={(it) => it.m.id}
              onReorder={(newIds) => handleReorder(newIds)}
              containerClassName="flex gap-2 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[#FFD700] scrollbar-track-[#2a2a2a]"
              renderItem={(it, handle, style) => (
                <div
                  ref={handle.ref}
                  style={style}
                  {...(handle.attributes ?? {})}
                  className={cn(
                    "group flex-none flex items-end gap-0 text-left transition-transform duration-200 hover:scale-[1.04] hover:z-10 relative",
                    handle.isOver ? "ring-2 ring-[#FFD700] rounded-md" : ""
                  )}
                >
                  {handle.insertionSide && (
                    <span
                      aria-hidden
                      className={"pointer-events-none absolute top-2 bottom-2 w-1 rounded-full bg-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.95)] animate-pulse z-30 " + (handle.insertionSide === "left" ? "-left-1" : "-right-1")}
                    />
                  )}
                  <span
                    className="text-[110px] md:text-[160px] leading-none font-black text-transparent select-none"
                    style={{
                      WebkitTextStroke: "3px #FFD700",
                      textShadow: "0 4px 30px rgba(0,0,0,0.6)",
                    }}
                    aria-hidden
                  >
                    {it.idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => playMovie(it.m)}
                    aria-label={"Play " + it.m.title}
                    className="w-[120px] sm:w-[150px] md:w-[170px] aspect-[2/3] -ml-6 md:-ml-8 rounded-md overflow-hidden bg-[#2a2a2a] shadow-lg block"
                  >
                    {it.m.poster ? (
                      <img
                        src={resolveMediaUrl(it.m.poster)}
                        alt={it.m.title}
                        loading="lazy"
                        onError={(e) => {
                          const img = e.currentTarget;
                          const fb = getFallbackArtForTitle(it.m.title).poster;
                          if (img.src !== fb) img.src = fb;
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={getFallbackArtForTitle(it.m.title).poster}
                        alt={it.m.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    {...(handle.listeners ?? {})}
                    aria-label={"Drag " + it.m.title + " to reorder"}
                    title="Drag to reorder"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center bg-black/70 hover:bg-black/90 text-white backdrop-blur-sm cursor-grab active:cursor-grabbing touch-none z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shadow-md ring-1 ring-white/10"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                </div>
              )}
            />
          </div>
        );
      } else {
        result.push(
          <div key={cat.id} className="mb-10">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-xl md:text-2xl font-semibold">{cat.name}</h2>
              <a href="#" className="text-sm text-[#FFD700] hover:underline">
                View All
              </a>
            </div>
            <SortableRail
              items={list}
              getId={(m) => m.id}
              onReorder={handleReorder}
              containerClassName="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[#FFD700] scrollbar-track-[#2a2a2a]"
              renderItem={(m, handle, style) => (
                <Card
                  movie={m}
                  onPlay={() => playMovie(m)}
                  isFav={favSet.has(m.id)}
                  onToggleFav={() => toggleFavorite(m.id)}
                  dragHandle={handle}
                  style={style}
                />
              )}
            />
          </div>
        );
      }
    }

    return result;
  }, [categories, movies, favorites, playCounts, lastPlayed, railSettings, moviesByCategory, orderTick, playMovie, favSet]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading your movies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans">
      {showIntro && <IntroOverlay onDone={dismissIntro} />}
      <Navbar scrolled={scrolled} onSearchOpen={() => setSearchOpen(true)} />
      <Hero movies={movies} onPlay={playMovie} />
      <section className="px-[4%] pb-12 -mt-20 relative z-10">
        {categories.length > 0 && (
          <p className="text-xs text-white/50 mb-3 flex items-center gap-1.5">
            <GripVertical className="w-3 h-3" />
            Tip: drag any thumbnail to reorder it within its row.
          </p>
        )}
        {renderRows()}
        {categories.length === 0 && (
          <div className="text-center py-20 text-white/60">
            No categories yet. Open the{" "}
            <Link to="/cms/categories" className="text-[#FFD700] underline">
              CMS
            </Link>{" "}
            to add some.
          </div>
        )}
      </section>
      <footer className="px-[4%] py-12 border-t border-white/10 mt-8 text-white/60 text-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="flex flex-col gap-2">
            <a href="#" className="hover:text-[#FFD700]">Audio and Subtitles</a>
            <a href="#" className="hover:text-[#FFD700]">Media Center</a>
            <a href="#" className="hover:text-[#FFD700]">Privacy</a>
            <a href="#" className="hover:text-[#FFD700]">Contact Us</a>
          </div>
          <div className="flex flex-col gap-2">
            <a href="#" className="hover:text-[#FFD700]">Audio Description</a>
            <a href="#" className="hover:text-[#FFD700]">Investor Relations</a>
            <a href="#" className="hover:text-[#FFD700]">Legal Notices</a>
          </div>
          <div className="flex flex-col gap-2">
            <a href="#" className="hover:text-[#FFD700]">Help Center</a>
            <a href="#" className="hover:text-[#FFD700]">Jobs</a>
            <a href="#" className="hover:text-[#FFD700]">Cookie Preferences</a>
          </div>
          <div className="flex flex-col gap-2">
            <a href="#" className="hover:text-[#FFD700]">Gift Cards</a>
            <a href="#" className="hover:text-[#FFD700]">Terms of Use</a>
            <a href="#" className="hover:text-[#FFD700]">Corporate Information</a>
          </div>
        </div>
        <p className="text-xs">
          © {new Date().getFullYear()} SmileFlex, Inc. All rights reserved. Built with ❤️ for endless entertainment.
        </p>
      </footer>
      {playing && <PlayerModal movie={playing} onClose={() => setPlaying(null)} />}
      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPlay={(m) => playMovie(m)}
      />
    </div>
  );
}