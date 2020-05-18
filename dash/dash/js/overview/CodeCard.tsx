import React from 'react';
import { Card } from "react-bootstrap";

class CodeCard extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hovering: false,
    };

    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseExit = this.handleMouseExit.bind(this);
  }

  handleMouseEnter(e) {
    e.preventDefault();
    this.setState({
      hovering: true,
    });
  }

  handleMouseExit(e) {
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
        onClick={() => onClick(uniqname)}
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
