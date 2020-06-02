import React from "react";
import { Card } from "react-bootstrap";
import StatusIcon from "./StatusIcon";

interface Props {
  id: string;
  status: {};
  onClick: () => void;
}

interface State {
  hovering: boolean;
}

class CodeCard extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      hovering: false,
    };

    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseExit = this.handleMouseExit.bind(this);
  }

  handleMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    this.setState({
      hovering: true,
    });
  }

  handleMouseExit(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    this.setState({
      hovering: false,
    });
  }

  render() {
    const { id, status, onClick } = this.props;
    const { hovering } = this.state;

    return (
      <Card
        className="code-card"
        border={hovering ? "primary" : "light"}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseExit}
        onClick={onClick}
      >
        <Card.Header>{id}</Card.Header>
        <Card.Body>
          <Card.Text className="code-text overflow-hidden">
            Code code code code code code Code code code code code code Code
            code code code code code Code code code code code code Code code
            code code code code code code
          </Card.Text>
        </Card.Body>
        <Card.Footer>
          <StatusIcon key={"test"} value={{}}/>
          {Object.entries(status).map((entry: [string, {}]) => {
            <StatusIcon key={entry[0]} value={entry[1]} />;
          })}
        </Card.Footer>
      </Card>
    );
  }
}

export default CodeCard;
