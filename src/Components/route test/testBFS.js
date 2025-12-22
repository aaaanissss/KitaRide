import { findAllRoutes } from "./bfsRoutes.js";

// Example adjacency list (sample data)
const graph = {
  "Pandan Jaya": ["Chan Sow Lin"],
  "Chan Sow Lin": ["Pandan Jaya", "Maluri"],
  "Maluri": ["Chan Sow Lin", "Taman Pertama"],
  "Taman Pertama": ["Maluri"]
};

const start = "Pandan Jaya";
const goal = "Maluri";

const allRoutes = findAllRoutes(graph, start, goal);
console.log(`Found ${allRoutes.length} route(s):`);
for (const route of allRoutes) {
  console.log(route.join(" -> "));
}
