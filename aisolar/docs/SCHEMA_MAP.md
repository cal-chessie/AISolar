# AISolar-V5 — Schema Map
### 40 tables · 40 FK relationships, grouped by layer. The logical view Supabase Studio's auto-layout won't give you.

```mermaid
flowchart LR
  subgraph G0["gate_bridge · kernel adapter"]
    direction TB
    n_gate_bridge__events["gate_bridge.events"]
  end
  subgraph G1["aigrids · the rails"]
    direction TB
    n_aigrids__specs["aigrids.specs"]
  end
  subgraph G2["Network"]
    direction TB
    n_brands["brands"]
    n_installers["installers"]
    n_sources["sources"]
  end
  subgraph G3["Leads hub"]
    direction TB
    n_leads["leads"]
  end
  subgraph G4["Lead pipeline"]
    direction TB
    n_activity_logs["activity_logs"]
    n_assignments["assignments"]
    n_contracts["contracts"]
    n_conversation_messages["conversation_messages"]
    n_conversations["conversations"]
    n_esb_submissions["esb_submissions"]
    n_installation_checklists["installation_checklists"]
    n_installed_equipment["installed_equipment"]
    n_invoices["invoices"]
    n_lead_documents["lead_documents"]
    n_lead_intake["lead_intake"]
    n_lead_touchpoints["lead_touchpoints"]
    n_notifications["notifications"]
    n_project_documents["project_documents"]
    n_proposals["proposals"]
    n_seai_applications["seai_applications"]
    n_seai_documents["seai_documents"]
    n_site_surveys["site_surveys"]
    n_survey_photos["survey_photos"]
    n_touchpoints["touchpoints"]
  end
  subgraph G5["Agent runtime"]
    direction TB
    n_agent_prompts["agent_prompts"]
    n_agent_queue["agent_queue"]
    n_agent_runs["agent_runs"]
    n_ai_config["ai_config"]
  end
  subgraph G6["Catalog"]
    direction TB
    n_products["products"]
    n_solar_products["solar_products"]
  end
  subgraph G7["Config & identity"]
    direction TB
    n_consent_records["consent_records"]
    n_email_templates["email_templates"]
    n_feedback["feedback"]
    n_follow_up_settings["follow_up_settings"]
    n_notification_preferences["notification_preferences"]
    n_profiles["profiles"]
    n_tenant_settings["tenant_settings"]
    n_user_roles["user_roles"]
  end
  n_site_surveys --> n_leads
  n_survey_photos --> n_site_surveys
  n_proposals --> n_leads
  n_proposals --> n_installers
  n_assignments --> n_leads
  n_assignments --> n_installers
  n_installation_checklists --> n_proposals
  n_installation_checklists --> n_leads
  n_installation_checklists --> n_installers
  n_seai_applications --> n_proposals
  n_seai_applications --> n_leads
  n_seai_documents --> n_seai_applications
  n_activity_logs --> n_leads
  n_project_documents --> n_leads
  n_notifications --> n_leads
  n_lead_intake --> n_leads
  n_agent_runs --> n_leads
  n_agent_queue --> n_leads
  n_touchpoints --> n_leads
  n_lead_documents --> n_leads
  n_installed_equipment --> n_leads
  n_esb_submissions --> n_leads
  n_esb_submissions --> n_lead_documents
  n_sources --> n_brands
  n_conversations --> n_leads
  n_conversation_messages --> n_conversations
  n_lead_touchpoints --> n_leads
  n_contracts --> n_leads
  n_invoices --> n_leads
  n_leads --> n_brands
```

**How to read it:** `gate_bridge` (kernel adapter) and `aigrids` (rails) sit apart from the app — they speak to the
kernel, they aren't the app. The **network** (brand→source) feeds the **leads hub**; every **pipeline** table hangs off
`leads` (child→parent arrows). **Catalog** + **config** are reference islands with no FKs — correct, and exactly what
was piling up as unconnected "roots" in Studio's tree. Arrows = foreign keys. Generated live from `ywizcsulurxoqjdgnkvc`.
