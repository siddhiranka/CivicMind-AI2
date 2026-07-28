// src/utils/departmentMap.js
// Maps detected civic issue keywords to the responsible municipal department.

const departmentMap = {
  pothole: "Road Maintenance",
  road: "Road Maintenance",
  "road damage": "Road Maintenance",
  flood: "Disaster Management",
  water: "Disaster Management",
  "water leakage": "Water Department",
  garbage: "Sanitation",
  trash: "Sanitation",
  waste: "Sanitation",
  "streetlight": "Electrical Department",
  "street light": "Electrical Department",
  "electric": "Electrical Department",
  "broken light": "Electrical Department",
  "illegal dumping": "Solid Waste Management",
  dumping: "Solid Waste Management",
  "fallen tree": "Parks & Trees",
  tree: "Parks & Trees",
  "traffic signal": "Traffic Department",
  signal: "Traffic Department",
  "road hazard": "Road Maintenance",
  "drainage": "Water Department",
  "storm water": "Water Department"
};

/**
 * Resolve a department name from a free‑text issue description.
 * @param {string} issueText free‑text issue detected by Gemini
 * @returns {string} department name or fallback "General Civic Services"
 */
function getDepartment(issueText) {
  if (!issueText) return "General Civic Services";
  const lower = issueText.toLowerCase();
  for (const key of Object.keys(departmentMap)) {
    if (lower.includes(key)) return departmentMap[key];
  }
  return "General Civic Services";
}

module.exports = { getDepartment, departmentMap };
