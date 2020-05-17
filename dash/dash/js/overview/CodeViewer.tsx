import React from "react";
import { Tabs, Tab, CardColumns } from "react-bootstrap";
import StarterCode from "./StarterCode";
import CodeCard from "./CodeCard";

export default function CodeViewer() {
  return (
    <fieldset className="border rounded p-2 ">
      <legend className="w-auto">Code</legend>
      <div className="code-view d-flex flex-column">
        <Tabs
          defaultActiveKey="solutions"
          transition={false}
          id="all-code-view-tabs"
        >
          <Tab eventKey="solutions" title="Student Solutions">
            <div className="flex-grow-1 overflow-auto">
              <CardColumns className="pt-2">
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
                <CodeCard />
              </CardColumns>
            </div>
          </Tab>
          <Tab eventKey="starter-code" title="Starter Code">
            <div className="py-2 flex-row flex-grow-1">
              <StarterCode />
            </div>
          </Tab>
        </Tabs>
      </div>
    </fieldset>
  );
}
