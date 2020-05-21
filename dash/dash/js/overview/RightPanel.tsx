import React from "react";
import { Tabs, Tab, CardColumns } from "react-bootstrap";
import FileTabs from "./FileTabs";
import CodeCard from "./CodeCard";
import CloseButton from "./CloseButton";
import { Nav, Button } from "react-bootstrap";

const STUDENT_SOLUTIONS = "student-solutions";
const STARTER_CODE = "starter-code";
const ID_TO_STUDENT: Record<string, string> = {};

interface Props {
  exerciseid: string;
  students: { name: string; id: string }[];
}

interface State {
  openStudentTabs: string[];
  currentTab: string;
}

class RightPanel extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    
    props.students.forEach((student) => {
      ID_TO_STUDENT[student.id] = student.name;
    });

    this.state = {
      openStudentTabs: [],
      currentTab: STUDENT_SOLUTIONS,
    };

    this.onCardClick = this.onCardClick.bind(this);
    this.selectTab = this.selectTab.bind(this);
    this.closeTab = this.closeTab.bind(this);
  }

  componentDidMount() {
    // TODO: fetch files for students
    // fetch(fileListUrl, { credentials: "same-origin" })
    //   .then((response) => {
    //     if (!response.ok) throw Error(response.statusText);
    //     return response.json();
    //   })
    //   .then((data) => {
    //     this.setState({
    //       fileList: data,
    //     });
    //   });
  }

  onCardClick(studentId: string) {
    if (this.state.openStudentTabs.indexOf(studentId) === -1) {
      this.setState((prevState) => ({
        openStudentTabs: prevState.openStudentTabs.concat([studentId]),
        currentTab: studentId,
      }));
    } else {
      this.setState(() => ({
        currentTab: studentId,
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

  closeTab(studentId: string) {
    const { openStudentTabs, currentTab } = this.state;

    const index = openStudentTabs.indexOf(studentId);
    let currTab = currentTab;

    if (currTab === studentId) {
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
    const { openStudentTabs, currentTab,  } = this.state;
    const { students, exerciseid } = this.props;

    let tabContent = null;
    if (currentTab == STUDENT_SOLUTIONS) {
      tabContent = (
        <div className="flex-grow-1 overflow-auto">
          <CardColumns className="pt-2">
            {students.map((student) => (
              <CodeCard
                key={student.id}
                uniqname={student.name}
                onClick={() => this.onCardClick(student.id)}
              />
            ))}
          </CardColumns>
        </div>
      );
    } else if (currentTab == STARTER_CODE) {
      tabContent = (
        <div className="py-2 flex-row flex-grow-1">
          <FileTabs fileListUrl={`/exercises/${exerciseid}/starter_files/`} />
        </div>
      );
    } else {
      tabContent = (
        <div className="py-2 flex-row flex-grow-1">
          <FileTabs
            fileListUrl={`/exercises/${exerciseid}/users/${currentTab}/files/`}
          />
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
            {openStudentTabs.map((id) => (
              <Nav.Item key={id}>
                <Nav.Link eventKey={id}>
                  {ID_TO_STUDENT[id]}
                  <CloseButton closeTab={() => this.closeTab(id)} />
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
