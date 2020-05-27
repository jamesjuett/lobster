import React from "react";
import { Container, Row, Col, ProgressBar } from "react-bootstrap";
import ProjectProgress from "./ProjectProgress";
import Timer from "./Timer";
import { Status } from "../SharedTypes";

interface Checkpoint {
  name: string;
  percentComplete: number;
}

interface Props {
  statuses: Status[];
  created: moment.Moment;
}

interface State {
  checkpoints: Checkpoint[];
  overallPercentComplete: number;
}

class LeftPanel extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      checkpoints: [],
      overallPercentComplete: 0,
    };

    this.calculateStatus = this.calculateStatus.bind(this);
  }

  componentDidMount() {
    this.calculateStatus();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.statuses != this.props.statuses) {
      this.calculateStatus();
    }
  }

  calculateStatus() {
    this.setState({
      checkpoints: [
        { name: "Part 1", percentComplete: 30 },
        { name: "Part 2", percentComplete: 60 },
        { name: "Part 3", percentComplete: 90 },
      ],
      overallPercentComplete: 60,
    });

    // TODO: Calclate the status
  }

  render() {
    const { statuses, created } = this.props;
    const { checkpoints, overallPercentComplete } = this.state;
    return (
      <div>
        <fieldset className="border rounded p-2 my-2">
          <legend className="w-auto">Summary</legend>
          <Container>
            <Row>
              <Col>Students Active:</Col>
              <Col className="text-right">{statuses.length}</Col>
            </Row>
            <Row>
              <Col>Exercise Time:</Col>
              <Col className="text-right"><Timer startTime={created}/></Col>
            </Row>
            <Row>
              <Col>Overall</Col>
              <Col className="my-auto">
                <ProgressBar
                  striped
                  variant="warning"
                  now={overallPercentComplete}
                />
              </Col>
              <Col xs="auto">60%</Col>
            </Row>
          </Container>
        </fieldset>

        <fieldset className="border rounded p-2 my-2">
          <legend className="w-auto">Checkpoints</legend>
          <Container>
            {checkpoints.map((checkpoint, idx) => (
              <ProjectProgress
                key={idx}
                name={checkpoint.name}
                percentComplete={checkpoint.percentComplete}
              />
            ))}
          </Container>
        </fieldset>
      </div>
    );
  }
}

export default LeftPanel;
