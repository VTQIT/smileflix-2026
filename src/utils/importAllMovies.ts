import { scanMovieFiles, extractMovieTitle, matchMovieToMetadata } from './movieScanner';
import { loadMetadata } from './localMetadata';
import { saveMovieToLocalDB } from './localDB';

export async function importAllMovies() {
  console.log('📁 Scanning movie files...');
  const movies = await scanMovieFiles();
  console.log(`Found ${movies.length} movies`);
  
  console.log('📚 Loading metadata...');
  const metadata = await loadMetadata();
  
  let imported = 0;
  let notFound = 0;
  
  for (const movie of movies) {
    const title = extractMovieTitle(movie.name);
    const result = matchMovieToMetadata(movie, metadata);
    
    if (result.match) {
      const movieData = {
        title: title,
        file_name: movie.name,
        file_path: movie.path,
        file_size: movie.size,
        metadata: result.metadata,
        added_date: new Date().toISOString(),
        confidence: result.confidence
      };
      
      await saveMovieToLocalDB(movieData);
      imported++;
      console.log(`✅ Imported: ${title} (${result.confidence * 100}% match)`);
    } else {
      notFound++;
      console.log(`❌ No metadata found for: ${title}`);
    }
  }
  
  console.log(`
  📊 Import Summary:
  ✅ Imported: ${imported}
  ❌ Not found: ${notFound}
  📁 Total movies: ${movies.length}
  `);
  
  return { imported, notFound, total: movies.length };
}

// Run this function when you want to import all movies
// Call it from your CMS or on app startup