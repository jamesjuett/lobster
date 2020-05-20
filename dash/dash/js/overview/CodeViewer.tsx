import React from "react";
import { Tabs, Tab, CardColumns } from "react-bootstrap";
import CodeFiles from "./CodeFiles";
import CodeCard from "./CodeCard";
import CloseButton from "./CloseButton";
import { Nav, Button } from "react-bootstrap";

const STUDENT_SOLUTIONS = "student-solutions";
const STARTER_CODE = "starter-code";

interface Props {
  students: string[];
}

interface State {
  openStudentTabs: string[],
  currentTab: string
}

class CodeViewer extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      openStudentTabs: [],
      currentTab: STUDENT_SOLUTIONS,
    };

    this.onCardClick = this.onCardClick.bind(this);
    this.selectTab = this.selectTab.bind(this);
    this.closeTab = this.closeTab.bind(this);
  }

  onCardClick(uniqname: string) {
    if (this.state.openStudentTabs.indexOf(uniqname) === -1) {
      this.setState((prevState) => ({
        openStudentTabs: prevState.openStudentTabs.concat([uniqname]),
        currentTab: uniqname,
      }));
    } else {
      this.setState(() => ({
        currentTab: uniqname,
      }));
    }
  }

  selectTab(tabId: string) {
    this.setState((prevState: State) => {
      if (
        prevState.openStudentTabs.indexOf(tabId) !== -1 ||
        tabId === STARTER_CODE ||
        tabId === STUDENT_SOLUTIONS
      ) {
        return { currentTab: tabId } as State;
      }
      return prevState;
    });
  }

  closeTab(uniqname: string) {
    const { openStudentTabs, currentTab } = this.state;

    const index = openStudentTabs.indexOf(uniqname);
    let currTab = currentTab;

    if (currTab === uniqname) {
      currTab = STUDENT_SOLUTIONS;
    }

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
    const { openStudentTabs, currentTab } = this.state;
    const { students } = this.props;

    let tabContent = null;
    if (currentTab == STUDENT_SOLUTIONS) {
      tabContent = (
        <div className="flex-grow-1 overflow-auto">
          <CardColumns className="pt-2">
            {students.map((student) => (
              <CodeCard
                key={student}
                uniqname={student}
                onClick={this.onCardClick}
              />
            ))}
          </CardColumns>
        </div>
      );
    } else if (currentTab == STARTER_CODE) {
      tabContent = (
        <div className="py-2 flex-row flex-grow-1">
          <CodeFiles />
        </div>
      );
    } else {
      tabContent = (
        <div className="py-2 flex-row flex-grow-1">
          <CodeFiles />
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
            {openStudentTabs.map((student) => (
              <Nav.Item key={student}>
                <Nav.Link eventKey={student}>
                  {student}
                  <CloseButton closeTab={() => this.closeTab(student)} />
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

export default CodeViewer;
