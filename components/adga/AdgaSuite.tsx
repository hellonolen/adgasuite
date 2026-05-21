"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./layout/Sidebar";
import { Topbar } from "./layout/Topbar";
import { HomeView } from "./views/HomeView";
import { PipelineView } from "./views/PipelineView";
import { LeadsView } from "./views/LeadsView";
import { CRMView } from "./views/CRMView";
import { DocumentsView } from "./views/DocumentsView";
import { KnowledgeView } from "./views/KnowledgeView";
import { IntelligenceView } from "./views/IntelligenceView";
import { AgentConsole } from "./agents/AgentConsole";
import { ADGAPanel } from "./agents/ADGAPanel";
import { Drawer } from "./shared/Drawer";
import { useSuiteState } from "@/lib/hooks/useSuiteState";

import "./styles.css";
import "./design-system.css";

export default function AdgaSuite() {
  const { state, loading, refresh } = useSuiteState();
  const [route, setRoute] = useState("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [agentCollapsed, setAgentCollapsed] = useState(false);
  const [agentState, setAgentState] = useState("idle");
  const [selectedDeal, setSelectedDeal] = useState<any>(null);

  // Sync route with agent panel state if needed
  const onWorkflow = (action: any) => {
    if (action.type === 'route') setRoute(action.route);
    if (action.type === 'open-deal') setSelectedDeal(action.deal);
    if (action.type === 'story') {
      setRoute('story');
      // Logic to focus story on dealId...
    }
  };

  if (loading && !state) {
    return (
      <div className="suite-loader">
        <div className="sb-logo pulse">A</div>
        <span>Hydrating ADGA Suite...</span>
      </div>
    );
  }

  const { deals = [], leads = [], tasks = [], intelligence = [], knowledge = [], people = [] } = state || {};

  const renderView = () => {
    switch (route) {
      case "home":         return <HomeView deals={deals} leads={leads} tasks={tasks} />;
      case "pipeline":     return <PipelineView deals={deals} onOpenDeal={setSelectedDeal} />;
      case "leads":        return <LeadsView leads={leads} />;
      case "crm":          return <CRMView people={people} />;
      case "documents":    return <DocumentsView documents={deals.flatMap((d: any) => d.documents || [])} />;
      case "knowledge":    return <KnowledgeView knowledge={knowledge} />;
      case "intelligence": return <IntelligenceView intelligence={intelligence} />;
      default:             return <HomeView deals={deals} leads={leads} tasks={tasks} />;
    }
  };

  return (
    <div className="app adga-presence-crisp" data-theme="light">
      <Sidebar
        route={route}
        setRoute={setRoute}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      <main className="main">
        <Topbar
          route={route}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
        {renderView()}
      </main>

      <div className="agent-rail">
        <ADGAPanel
          state={agentState}
          setState={setAgentState}
          collapsed={agentCollapsed}
          setCollapsed={setAgentCollapsed}
          onWorkflow={onWorkflow}
          deals={deals}
        />
        <AgentConsole
          state={agentState}
          setState={setAgentState}
          collapsed={!agentCollapsed} // Show Console when Panel is hidden? Or separate toggle.
          setCollapsed={() => setAgentCollapsed(false)}
          onWorkflow={onWorkflow}
          deals={deals}
        />
      </div>

      {selectedDeal && (
        <Drawer
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
        />
      )}
    </div>
  );
}
