import React from "react";
import { CardColumns } from "react-bootstrap";
import FileTabs from "./FileTabs";
import CodeCard from "./CodeCard";
import CloseButton from "./CloseButton";
import { Nav } from "react-bootstrap";
import { Project } from "../SharedTypes";

const STUDENT_SOLUTIONS = 'student-solutions';
const STARTER_CODE = 'starter-code';

interface ProjectId {
  projectid: string;
  email: string;
}

interface Props {
  projects: Project[];
  exerciseId: number;
}

interface State {
  openStudentTabs: ProjectId[];
  currentTab: string;
  hideNames: boolean;
}

class RightPanel extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      currentTab: STUDENT_SOLUTIONS,
      openStudentTabs: [],
      hideNames: false,
    };

    this.onCardClick = this.onCardClick.bind(this);
    this.selectTab = this.selectTab.bind(this);
    this.closeTab = this.closeTab.bind(this);
  }

  onCardClick(projectObject: ProjectId) {
    // If the clicked card is not open, open a new tab and navigate to it
    if (
      this.state.openStudentTabs.findIndex(
        (elem: ProjectId) => elem.projectid === projectObject.projectid
      ) === -1
    ) {
      this.setState((prevState) => ({
        openStudentTabs: prevState.openStudentTabs.concat([projectObject]),
        currentTab: projectObject.projectid,
      }));
    }
    // Otherwise, just navigate to the tab that already exists
    else {
      this.setState(() => ({
        currentTab: projectObject.projectid,
      }));
    }
  }

  selectTab(eventKey: string) {
    this.setState((prevState: State) => {
      // set current tab to a valid tabId
      if (
        prevState.openStudentTabs.findIndex(
          (elem: ProjectId) => elem.projectid === eventKey
        ) !== -1 ||
        eventKey === STARTER_CODE ||
        eventKey === STUDENT_SOLUTIONS
      ) {
        return { currentTab: eventKey } as State;
      }
      return prevState;
    });
  }

  closeTab(tabId: string) {
    const { openStudentTabs, currentTab } = this.state;

    // Find the index of the tab to remove
    const index = openStudentTabs.findIndex(
      (elem: ProjectId) => elem.projectid === tabId
    );

    // If the current tab is open, then go back to student solutions
    let currTab = currentTab;
    if (currTab === tabId) {
      currTab = STUDENT_SOLUTIONS;
    }

    // If the tabId is valid, then remove the tab
    if (index > -1) {
      this.setState((prevState) => ({
        openStudentTabs: prevState.openStudentTabs.filter(
          (_, i) => i !== index
        ),
        currentTab: currTab,
      }));
    }
  }

  render() {
    const { openStudentTabs, currentTab, hideNames } = this.state;
    const { projects, exerciseId } = this.props;

    let tabContent = null;
    if (currentTab === STUDENT_SOLUTIONS) {
      tabContent = (
        <div className="flex-grow-1 overflow-auto">
          <CardColumns className="pt-2">
            {projects.map((project) => (
              <CodeCard
                key={project.projectid}
                id={hideNames ? `${project.projectid}` : project.email}
                onClick={() =>
                  this.onCardClick({
                    projectid: `${project.projectid}`,
                    email: project.email,
                  })
                }
              />
            ))}
          </CardColumns>
        </div>
      );
    } else if (currentTab === STARTER_CODE) {
      tabContent = (
        <div className="py-2 flex-row flex-grow-1">
          <FileTabs fileListUrl={`/exercises/${exerciseId}/starter_files/`} />
        </div>
      );
    } else {
      tabContent = (
        <div className="py-2 flex-row flex-grow-1">
          <FileTabs fileListUrl={`/projects/${currentTab}/files/`} />
        </div>
      );
    }

    return (
      <fieldset className="border rounded p-2 ">
        <legend className="w-auto">Code</legend>
        <div className="code-view d-flex flex-column">
          <Nav
            variant="tabs"
            activeKey={currentTab}
            defaultActiveKey={STUDENT_SOLUTIONS}
            onSelect={this.selectTab}
          >
            <Nav.Item key={STUDENT_SOLUTIONS}>
              <Nav.Link eventKey={STUDENT_SOLUTIONS}>
                Student Solutions
              </Nav.Link>
            </Nav.Item>
            <Nav.Item key={STARTER_CODE}>
              <Nav.Link eventKey={STARTER_CODE}>Starter Code</Nav.Link>
            </Nav.Item>
            {openStudentTabs.map((project: ProjectId) => (
              <Nav.Item key={project.projectid}>
                <Nav.Link eventKey={project.projectid}>
                  {hideNames ? project.projectid : project.email}
                  <CloseButton
                    closeTab={() => this.closeTab(project.projectid)}
                  />
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
          {tabContent}
        </div>
      </fieldset>
    );
  }
}

export default RightPanel;
