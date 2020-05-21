import React from "react";
import { Container, Row, Col, ProgressBar } from "react-bootstrap";
import ProjectProgress from "./ProjectProgress";

interface Props {}

interface State {
  projects: { name: string; percentComplete: number }[];
}

class LeftPanel extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      projects: [
        { name: "Part 1", percentComplete: 88 },
        { name: "Part 2", percentComplete: 57 },
        { name: "Part 3", percentComplete: 21 },
      ],
    };
  }

  render() {
    const { projects } = this.state;
    return (
      <div>
        <fieldset className="border rounded p-2 my-2">
          <legend className="w-auto">Summary</legend>
          <Container>
            <Row>
              <Col>Students Active:</Col>
              <Col className="text-right">152</Col>
            </Row>
            <Row>
              <Col>Exercise Time:</Col>
              <Col className="text-right">2:17 minutes</Col>
            </Row>
            <Row>
              <Col>Overall</Col>
              <Col className="my-auto">
                <ProgressBar striped variant="warning" now={60} />
              </Col>
              <Col xs="auto">60%</Col>
            </Row>
          </Container>
        </fieldset>

        <fieldset className="border rounded p-2 my-2">
          <legend className="w-auto">Checkpoints</legend>
          <Container>
            {projects.map((project, idx) => (
              <ProjectProgress
                idx={idx + 1}
                name={project.name}
                percentComplete={project.percentComplete}
              />
            ))}
          </Container>
        </fieldset>
      </div>
    );
  }
}

export default LeftPanel;
