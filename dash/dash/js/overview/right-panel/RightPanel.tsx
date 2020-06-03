import React from "react";
import { CardColumns } from "react-bootstrap";
import FileTabs from "./FileTabs";
import CodeCard from "./CodeCard";
import CloseButton from "./CloseButton";
import { Nav } from "react-bootstrap";
import { Project } from "../SharedTypes";

const STUDENT_SOLUTIONS = "student-solutions";
const STARTER_CODE = "starter-code";

interface Props {
  projects: Project[];
  exerciseId: number;
  showNames: boolean;
}

interface State {
  openStudentTabs: Project[];
  currentTab: string;
  starterFiles: string[];
  starterFilesUrl: string;
}

class RightPanel extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      currentTab: STUDENT_SOLUTIONS,
      openStudentTabs: [],
      starterFiles: [],
      starterFilesUrl: "",
    };

    this.onCardClick = this.onCardClick.bind(this);
    this.selectTab = this.selectTab.bind(this);
    this.closeTab = this.closeTab.bind(this);
    this.getUniqname = this.getUniqname.bind(this);
  }

  componentDidMount() {
    const { exerciseId } = this.props;
    this.setState({
      starterFiles: ["file1", "file2", "file3"],
      starterFilesUrl: `/exercises/${exerciseId}/starter_files/`,
    });
    // TODO: fetch list of starter files
    // fetch(this.state.starterFilesUrl, {
    //   credentials: "same-origin",
    // })
    //   .then((response) => {
    //     if (!response.ok) throw Error(response.statusText);
    //     return response.json();
    //   })
    //   .then((data) => {
    //     this.setState({
    //       starterFiles: data.files,
    //     });
    //   });
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.exerciseId != this.props.exerciseId) {
      this.setState({
        starterFilesUrl: `/exercises/${this.props.exerciseId}/starter_files/`,
      });
    }
  }

  onCardClick(projectObject: Project) {
    // If the clicked card is not open, open a new tab and navigate to it
    if (
      this.state.openStudentTabs.findIndex(
        (elem: Project) => elem.projectid === projectObject.projectid
      ) === -1
    ) {
      this.setState((prevState) => ({
        openStudentTabs: prevState.openStudentTabs.concat([projectObject]),
        currentTab: `${projectObject.projectid}`,
      }));
    }
    // Otherwise, just navigate to the tab that already exists
    else {
      this.setState(() => ({
        currentTab: `${projectObject.projectid}`,
      }));
    }
  }

  selectTab(eventKey: string) {
    this.setState((prevState: State) => {
      // set current tab to a valid tabId
      if (
        prevState.openStudentTabs.findIndex(
          (elem: Project) => `${elem.projectid}` === eventKey
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
      (elem: Project) => `${elem.projectid}` === tabId
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

  getUniqname(email: string) {
    const atLocation = email.indexOf("@");
    return email.substring(0, atLocation);
  }

  render() {
    const {
      openStudentTabs,
      currentTab,
      starterFiles,
      starterFilesUrl,
    } = this.state;
    const { projects, showNames } = this.props;

    let tabContent = null;
    if (currentTab === STUDENT_SOLUTIONS) {
      tabContent = (
        <div className="flex-grow-1 overflow-auto">
          <CardColumns className="pt-2">
            {projects.map((project) => (
              <CodeCard
                key={project.projectid}
                id={
                  showNames
                    ? this.getUniqname(project.email)
                    : `${project.projectid}`
                }
                status={project.status}
                onClick={() =>
                  this.onCardClick(project)
                }
              />
            ))}
          </CardColumns>
        </div>
      );
    } else if (currentTab === STARTER_CODE) {
      tabContent = (
        <div className="py-2 flex-grow-1 h-75">
          <FileTabs baseUrl={starterFilesUrl} fileList={starterFiles} />
        </div>
      );
    } else {
      // Find the ProjectId of the current tab
      const currTabInfo = openStudentTabs.find(
        (elem: Project) => `${elem.projectid}` === currentTab
      );

      tabContent = (
        <div className="py-2 flex-grow-1 h-75">
          <FileTabs
            baseUrl={`/projects/${currentTab}/files/`}
            fileList={currTabInfo.filenames}
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
            {openStudentTabs.map((project: Project) => (
              <Nav.Item key={project.projectid}>
                <Nav.Link eventKey={project.projectid}>
                  {showNames ? this.getUniqname(project.email) : project.projectid}
                  <CloseButton
                    closeTab={() => this.closeTab(`${project.projectid}`)}
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
