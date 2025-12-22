/*
===========================================================
  findKShortestRoutes()
  --------------------------------------------
  PURPOSE:
    Returns ONLY the shortest route(s) between two stations,
    instead of ALL possible simple paths.

    This solves the problem where normal BFS finds many long,
    unrealistic detour routes (e.g., AG10 → AG11 → MP24 → ... → SP10).
    Real transit apps only show the best/shortest options.

  HOW IT WORKS:
    • Standard BFS will always find the shortest path first.
    • The first time we reach the goal, we record that length
      as "shortestLen".
    • We continue exploring ONLY paths with the same length
      (ties), and ignore deeper/longer paths entirely.
    • We stop once we have collected K shortest routes (default K=3).

  PARAMETERS:
    graph     - adjacency list (object) { stationID: [neighbors...] }
    start     - starting station ID (string)
    goal      - destination station ID (string)
    k         - how many shortest paths to return (default: 3)
    maxDepth  - max allowed path length to avoid infinite loops

  RETURNS:
    Array of shortest path arrays:
      e.g. [
        ["AG10", "SP10"],
        ["AG10", "AG11", "SP11", "SP10"]  // only if same length as shortest
      ]

  BENEFITS:
    ✓ Stops huge detours
    ✓ Avoids long loops
    ✓ Matches real journey planners
    ✓ Improves performance dramatically

  NOTES:
    • If only one shortest path exists, returns just that one.
    • If multiple shortest paths exist (same number of stops),
      returns up to K of them.
===========================================================
*/

export function findKShortestRoutes(graph, start, goal, k = 3, maxDepth = 50) {
  console.log(`🔍 BFS-K searching shortest: ${start} -> ${goal}`);

  if (!graph[start] || !graph[goal]) return [];

  const queue = [[start]];
  const results = [];
  const seenRouteKeys = new Set();

  let shortestLen = null; // length of first found shortest path

  while (queue.length && results.length < k) {
    const path = queue.shift();
    const last = path[path.length - 1];

    // If we already found shortest paths, don't explore deeper ones
    if (shortestLen !== null && path.length > shortestLen) {
      continue;
    }

    if (last === goal) {
      const key = path.join("->");
      if (!seenRouteKeys.has(key)) {
        seenRouteKeys.add(key);
        results.push(path);
        shortestLen = path.length; // first hit defines shortest length
        console.log(`✅ shortest path ${results.length}: ${key}`);
      }
      continue;
    }

    if (path.length >= maxDepth) continue;

    for (const nb of graph[last] || []) {
      if (!path.includes(nb)) {
        queue.push([...path, nb]);
      }
    }
  }

  console.log(`📊 BFS-K done: ${results.length} shortest routes`);
  return results;
}
