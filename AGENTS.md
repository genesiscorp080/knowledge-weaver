# Architecture rules

- Load document metadata at sign-in and fetch each document body on demand through DocumentContext; large books must not delay library display.
- Key account data loading by user ID, cancel stale requests, and deduplicate document-body requests; token refreshes must not reload the library or leak data between accounts.
- Build PDFs as awaited blobs with a shared export wrapper, a global illustration deadline, and a fresh download action on touch devices; remote image failures and lost browser activation must not silently block exports.
- Downsample PDF raster visuals and encode them as JPEG on white before embedding; hundreds of raw chart rasters can exceed browser string and memory limits.