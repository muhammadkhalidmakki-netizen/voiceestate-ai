// Single source of truth for the demo lead, used by both the LeadCard UI
// and the Vapi call.
export const DEMO_LEAD = {
  name: "James Carter",
  title: "Dubai Property Enquiry",
  country: "UAE",
  projectInterest: "Dubai Real Estate",
  // Display-only details. These are NOT sent to the assistant.
  email: "james.carter.demo@example.com",
  // UI-only demo value. Not sent to Vapi and not used for calling.
  phone: "+1 (555) 014-7826",
  source: "Google Ads",
} as const;

// The only values injected into the call. Keys must match the
// {{placeholders}} in the assistant's prompt.
export const DEMO_LEAD_VARIABLES = {
  lead_name: DEMO_LEAD.name,
  lead_country: DEMO_LEAD.country,
  lead_project_interest: DEMO_LEAD.projectInterest,
};
