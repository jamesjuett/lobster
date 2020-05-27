import React from "react";
import { Row, Col, ProgressBar } from "react-bootstrap";

interface Props {
  name: string;
  percentComplete: number;
}
interface State {}

class ProjectProgress extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.getBarColor = this.getBarColor.bind(this);
  }

  getBarColor() {
    const { percentComplete } = this.props;

    if (percentComplete <= 30) {
      return "danger";
    } else if (percentComplete > 30 && percentComplete < 85) {
      return "warning";
    } else {
      return "success";
    }
  }

  render() {
    const { percentComplete, name } = this.props;
    return (
      <Row>
        <Col>
          {name}
        </Col>
        <Col className="my-auto">
          <ProgressBar
            striped
            variant={this.getBarColor()}
            now={percentComplete}
          />
        </Col>
        <Col xs="auto">{percentComplete}%</Col>
      </Row>
    );
  }
}

export default ProjectProgress;
