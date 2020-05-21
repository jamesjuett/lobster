import React from "react";
import { Card } from "react-bootstrap";

interface Props {
  uniqname: string;
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
    const { uniqname, onClick } = this.props;
    const { hovering } = this.state;

    return (
      <Card
        className="code-card overflow-hidden"
        border={hovering ? "primary" : "light"}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseExit}
        onClick={onClick}
      >
        <Card.Header>{uniqname}</Card.Header>
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
