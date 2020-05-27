import React from "react";
import { Button, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";

interface Props {
  exerciseid: number;
}

interface State {
  name: string;
}

class Header extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      name: "",
    };

    this.getExerciseName = this.getExerciseName.bind(this);
  }

  componentDidMount() {
    this.getExerciseName();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.exerciseid != this.props.exerciseid){
      this.getExerciseName();
    }

  }

  getExerciseName() {
    const { exerciseid } = this.props;
    this.setState({name: "Exercise 1.1"})
    // TODO
    // fetch(`/exerciseid/${exerciseid}/`, { credentials: "same-origin" })
    //   .then((response) => {
    //     if (!response.ok) throw Error(response.statusText);
    //     return response.json();
    //   })
    //   .then((data) => {
    //     this.setState({
    //       name: data.name,
    //     });
    //   });
  }

  render() {
    const { name } = this.state;

    return (
      <Row className="border-bottom">
        <Col className="d-none d-lg-block">
          <div className="text-center position-relative">
            <div className="position-absolute">
              <Link to="/dashboard">
                <Button variant="light">Back to dashboard</Button>
              </Link>
            </div>
            <h3 className="w-100 text-center">{name}</h3>
          </div>
        </Col>
        <Col className="d-xs-block d-lg-none">
          <Link to="/dashboard">
            <Button variant="light">Back to dashboard</Button>
          </Link>
        </Col>
        <Col className="d-xs-block d-lg-none">
          <h3 className="w-100 text-center">{name}</h3>
        </Col>
      </Row>
    );
  }
}

export default Header;
