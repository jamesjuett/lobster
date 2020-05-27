import React from "react";
import { Card } from "react-bootstrap";

interface Props {
  id: string;
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
    const { id, onClick } = this.props;
    const { hovering } = this.state;

    return (
      <Card
        className="code-card overflow-hidden"
        border={hovering ? "primary" : "light"}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseExit}
        onClick={onClick}
      >
        <Card.Header>{id}</Card.Header>
        <Card.Body>
          <Card.Text>
            Code code code code code code Code code code code code code Code
            code code code code code Code code code code code code Code code
            code code code code code code
          </Card.Text>
        </Card.Body>
      </Card>
    );
  }
}

export default CodeCard;
