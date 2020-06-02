import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync } from "@fortawesome/free-solid-svg-icons";
import { Container, Row, Col, Button } from "react-bootstrap";
import { RouteComponentProps, withRouter } from "react-router";
import LeftPanel from "./left-panel/LeftPanel";
import RightPanel from "./right-panel/RightPanel";
import Header from "./Header";
import { Project, Status } from "./SharedTypes";
import moment from "moment";

interface MatchParams {
  sessionid: string;
}

interface Props extends RouteComponentProps<MatchParams> {}

interface State {
  seq: number;
  renderedSeq: number;
  updateInterval: number;
  lastUpdated: moment.Moment;
  sessionInfo: {
    sessionid: number;
    name: string;
    exerciseid: number;
    active: boolean;
    time_created: string;
  };
  projects: Project[];
  statuses: Status[];
  showNames: boolean;
}

class Overview extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      seq: 0,
      renderedSeq: 0,
      updateInterval: -1,
      lastUpdated: moment(),
      sessionInfo: {
        sessionid: -1,
        name: "",
        exerciseid: -1,
        active: false,
        time_created: "",
      },
      projects: [],
      statuses: [],
      showNames: true,
    };

    this.toggleExercise = this.toggleExercise.bind(this);
    this.getUpdatedData = this.getUpdatedData.bind(this);
    this.anonymizeNames = this.anonymizeNames.bind(this);
    this.retrieveProjectData = this.retrieveProjectData.bind(this);
    this.retrieveSessionStatus = this.retrieveSessionStatus.bind(this);
  }

  componentDidMount() {
    const {
      match: {
        params: { sessionid },
      },
    } = this.props;

    const sessionUrl = `/sessions/${sessionid}/`;
    this.setState(
      {
        lastUpdated: moment(),
        sessionInfo: {
          sessionid: 1234,
          name: "My session",
          exerciseid: 5678,
          active: true,
          time_created: "2020-05-27T18:56:26",
        },
        updateInterval: setInterval(() => this.getUpdatedData(), 30000),
      },
      this.getUpdatedData
    );
    // TODO
    // fetch(sessionUrl, { credentials: "same-origin" })
    //   .then((response) => {
    //     if (!response.ok) throw Error(response.statusText);
    //     return response.json();
    //   })
    //   .then((data) => {
    //     this.setState(
    //       {
    //         lastUpdated: moment(),
    //         sessionInfo: data,
    //         updateInterval: setInterval(() => this.getUpdatedData(), 30000),
    //       },
    //       this.getUpdatedData
    //     );
    //   });
  }

  componentWillUnmount() {
    clearInterval(this.state.updateInterval);
  }

  anonymizeNames() {
    this.setState((prevState: State) => ({
      showNames: !prevState.showNames,
    }));
  }

  getUpdatedData() {
    console.log("Update!");
    this.setState(
      (prevState) => ({
        seq: prevState.seq + 1,
      }),
      () => {
        this.retrieveProjectData(this.state.seq);
        this.retrieveSessionStatus(this.state.seq);
      }
    );
  }

  retrieveProjectData(seq: number) {
    const {
      match: {
        params: { sessionid },
      },
    } = this.props;

    this.setState({
      lastUpdated: moment(),
      projects: [
        {
          projectid: 0,
          email: "cmfh0@umich.edu",
          sessionid: 1234,
          exerciseid: 5678,
          lastmodified: "Never",
          status: {},
          filenames: ["file1", "file2", "file3"],
        },
        {
          projectid: 1,
          email: "cmfh1@umich.edu",
          sessionid: 1234,
          exerciseid: 5678,
          lastmodified: "Never",
          status: {},
          filenames: ["file1", "file2", "file3"],
        },
        {
          projectid: 2,
          email: "cmfh2@umich.edu",
          sessionid: 1234,
          exerciseid: 5678,
          lastmodified: "Never",
          status: {},
          filenames: ["file1", "file2", "file3"],
        },
        {
          projectid: 3,
          email: "cmfh3@umich.edu",
          sessionid: 1234,
          exerciseid: 5678,
          lastmodified: "Never",
          status: {},
          filenames: ["file1", "file2", "file3"],
        },
        {
          projectid: 4,
          email: "cmfh4@umich.edu",
          sessionid: 1234,
          exerciseid: 5678,
          lastmodified: "Never",
          status: {},
          filenames: ["file1", "file2", "file3"],
        },
        {
          projectid: 5,
          email: "cmfh5@umich.edu",
          sessionid: 1234,
          exerciseid: 5678,
          lastmodified: "Never",
          status: {},
          filenames: ["file1", "file2", "file3"],
        },
        {
          projectid: 6,
          email: "cmfh6@umich.edu",
          sessionid: 1234,
          exerciseid: 5678,
          lastmodified: "Never",
          status: {},
          filenames: ["file1", "file2", "file3"],
        },
        {
          projectid: 7,
          email: "cmfh7@umich.edu",
          sessionid: 1234,
          exerciseid: 5678,
          lastmodified: "Never",
          status: {},
          filenames: ["file1", "file2", "file3"],
        },
      ],
    });

    // TODO
    // fetch(`/sessions/${sessionid}/projects`, { credentials: "same-origin" })
    //   .then((response) => {
    //     if (!response.ok) throw Error(response.statusText);
    //     return response.json();
    //   })
    //   .then((data) => {
    //     if (seq >= this.state.renderedSeq) {
    //       this.setState({
    //         lastUpdated: moment(),
    //         projects: data,
    //         renderedSeq: seq,
    //       });
    //     }
    //   });
  }

  retrieveSessionStatus(seq: number) {
    const {
      match: {
        params: { sessionid },
      },
    } = this.props;

    this.setState({
      lastUpdated: moment(),
      statuses: [{}, {}, {}, {}, {}, {}, {}, {}],
    });

    // TODO
    // fetch(`/sessions/${sessionid}/status`, { credentials: "same-origin" })
    //   .then((response) => {
    //     if (!response.ok) throw Error(response.statusText);
    //     return response.json();
    //   })
    //   .then((data) => {
    //     if (seq >= this.state.renderedSeq) {
    //       this.setState({
    //         lastUpdated: moment(),
    //         statuses: data,
    //         renderedSeq: seq
    //       });
    //     }
    //   });
  }

  toggleExercise(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const {
      match: {
        params: { sessionid },
      },
    } = this.props;

    let url = `/sessions/${sessionid}/stop/`;
    if (!this.state.sessionInfo.active) {
      url = `/sessions/${sessionid}/sessions/`;
    }

    console.log(url);
    this.setState((prevState: State) => ({
      sessionInfo: {
        ...prevState.sessionInfo,
        active: !prevState.sessionInfo.active,
      },
    }));
    // TODO
    // fetch(url, { credentials: "same-origin", method: "PATCH" })
    //   .then((response) => {
    //     if (!response.ok) throw Error(response.statusText);
    //     return response.json();
    //   })
    //   .then((data) => {
    //     this.setState({
    //       lastUpdated: moment(),
    //       sessionInfo: data,
    //     });
    //   });
  }

  render() {
    const {
      sessionInfo: { active, exerciseid, time_created },
      lastUpdated,
      projects,
      statuses,
      showNames,
    } = this.state;
    return (
      <Container fluid className="py-2">
        <Header exerciseid={exerciseid} />
        <Row className="mt-3">
          <Col md={12} lg={4}>
            <div className="d-flex align-items-center justify-content-end">
              <span className="pr-1">
                Last Updated: {lastUpdated.format("h:mm:ss a")}
              </span>
              <Button variant="outline-success" onClick={this.getUpdatedData}>
                <FontAwesomeIcon icon={faSync} />
              </Button>
            </div>
          </Col>
          <Col md={12} lg={8} className="justify-content-end">
            <div className="d-flex align-items-center justify-content-end">
              <Button className="mx-1" onClick={this.anonymizeNames}>
                {showNames ? "Hide names" : "Show names"}
              </Button>
              <Button className="mx-1" onClick={this.toggleExercise}>
                {active ? "Stop Exercise" : "Start Exercise"}
              </Button>
            </div>
          </Col>
        </Row>
        <Row className="pb-1">
          <Col md={12} lg={4}>
            <LeftPanel statuses={statuses} created={moment(time_created)} />
          </Col>
          <Col md={12} lg={8}>
            <RightPanel
              projects={projects}
              exerciseId={exerciseid}
              showNames={showNames}
            />
          </Col>
        </Row>
      </Container>
    );
  }
}

export default withRouter(Overview);
