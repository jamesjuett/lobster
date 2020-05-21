import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync } from "@fortawesome/free-solid-svg-icons";
import { Container, Row, Col, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import { RouteComponentProps, withRouter } from "react-router";
import LeftPanel from "./LeftPanel";
import RightPanel from "./RightPanel";
import moment from "moment";

interface MatchParams {
  exerciseid: string;
  classid: string;
}

interface Props extends RouteComponentProps<MatchParams> {}

interface State {
  exerciseStarted: boolean;
  lastUpdated: moment.Moment;
}

class Overview extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      exerciseStarted: false,
      lastUpdated: moment(),
    };

    this.toggleExercise = this.toggleExercise.bind(this);
    this.retrieveData = this.retrieveData.bind(this);
  }

  componentDidMount() {
    this.retrieveData();
  }

  retrieveData() {
    console.log("This is where we retrieve data!");
    this.setState({
      lastUpdated: moment(),
    });
    // fetch(url, { credentials: "same-origin", method, body })
    //   .then((response) => {
    //     if (!response.ok) throw Error(response.statusText);
    //     return response.json();
    //   })
    //   .then((data) => {

    //     this.setState({
    //       exerciseStarted: true,
    //     });
    //   });
  }

  toggleExercise(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const {
      match: {
        params: { exerciseid },
      },
    } = this.props;

    let url = "/sessions/{sessionid}/stop/";
    let method = "PATCH";
    let body = new FormData();
    if (!this.state.exerciseStarted) {
      url = `/exercises/${exerciseid}/sessions/`;
      method = "POST";
      body.append("name", "abc123");
      body.append("active", "true");
    }

    console.log(url, method, body);
    this.setState((prevState: State) => ({
      exerciseStarted: !prevState.exerciseStarted,
    }));
    // fetch(url, { credentials: "same-origin", method, body })
    //   .then((response) => {
    //     if (!response.ok) throw Error(response.statusText);
    //     return response.json();
    //   })
    //   .then((data) => {

    //     this.setState({
    //       exerciseStarted: true,
    //     });
    //   });
  }

  render() {
    const { exerciseStarted, lastUpdated } = this.state;
    return (
      <Container fluid className="py-2">
        <Row className="border-bottom">
          <Col className="d-none d-lg-block">
            <div className="text-center position-relative">
              <div className="position-absolute">
                <Link to="/dashboard">
                  <Button variant="light">Back to dashboard</Button>
                </Link>
              </div>
              <h3 className="w-100 text-center">Exercise 3.1 - largest()</h3>
            </div>
          </Col>
          <Col className="d-xs-block d-lg-none">
            <Link to="/dashboard">
              <Button variant="light">Back to dashboard</Button>
            </Link>
          </Col>
          <Col className="d-xs-block d-lg-none">
            <h3 className="w-100 text-center">Exercise 3.1 - largest()</h3>
          </Col>
        </Row>
        <Row className="mt-3 pb-1">
          <Col md={12} lg={4}>
            <div className="d-flex justify-content-between">
              <Button onClick={this.toggleExercise}>
                {exerciseStarted ? "Stop Exercise" : "Start Exercise"}
              </Button>
              <div className="d-flex align-items-center">
                <span className="pr-1">
                  Last Updated: {lastUpdated.format("h:mm:ss a")}
                </span>
                <Button variant="outline-success" onClick={this.retrieveData}>
                  <FontAwesomeIcon icon={faSync} />
                </Button>
              </div>
            </div>
            <LeftPanel />
          </Col>
          <Col md={12} lg={8}>
            <RightPanel
              students={[
                "cmfh",
                "cmfh2",
                "cmfh3",
                "cmfh4",
                "cmfh5",
                "cmfh6",
                "cmfh7",
                "cmfh8",
                "cmfh9",
                "cmfh10",
              ]}
            />
          </Col>
        </Row>
      </Container>
    );
  }
}

export default withRouter(Overview);
