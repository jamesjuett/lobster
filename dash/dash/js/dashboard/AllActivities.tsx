import React from "react";
import { Row, Container, Tabs, Tab, CardColumns } from "react-bootstrap";
import { Nav, Button } from "react-bootstrap";

const STUDENT_SOLUTIONS = "student-solutions";
const STARTER_CODE = "starter-code";

// interface Props {
//   students: string[];
// }

// interface State {
//   openStudentTabs: string[],
//   currentTab: string
// }

class AllActivities extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      
    };

   
  }


  render() {
    return (
      <div className="col-lg-7 col-md-12">
        <fieldset className="border rounded p-2 ">
          <legend className="w-auto">All Excercises</legend>
            <Container>
              <div className="accordion" id="accordion">
                <fieldset className="border rounded p-2 my-2">
                  <div className="accordion-group">
                    <div className="accordion-heading">
                      <a className="accordion-toggle" data-toggle="collapse" data-target="#collapseOne">
                        <fieldset>EECS 280</fieldset>
                      </a>
                    </div>
                    <div id="collapseOne" className=" collapse in">
                      <div className="accordion-inner ml-4">
                        <Row>Activity 1</Row>
                        <Row>Activity 2</Row>
                      </div>
                    </div>
                  </div>
                </fieldset>
                  <fieldset className="border rounded p-2 my-2">
                    <div className="accordion-group">
                    <div className="accordion-heading">
                      <a className="accordion-toggle" data-toggle="collapse" data-target="#collapseTwo">
                        <fieldset>EECS 183</fieldset>
                      </a>
                    </div>
                    <div id="collapseTwo" className=" collapse">
                        <div className="accordion-inner ml-4">
                        <Row>Activity 3</Row>
                        <Row>Activity 4</Row>
                        </div>
                    </div>
                    </div>
                  </fieldset>
                  <fieldset className="border rounded p-2 my-2">
                      <div className="accordion-group">
                      <div className="accordion-heading">
                          <a className="accordion-toggle" data-toggle="collapse" data-target="#collapseThree">
                            <fieldset>EECS 101</fieldset>
                          </a>
                      </div>
                      <div id="collapseThree" className=" collapse">
                          <div className="accordion-inner ml-4">
                          <Row>Activity 5</Row>
                          <Row>Activity 6</Row>
                          <Row>Activity 7</Row>
                          </div>
                      </div>
                      </div>
                  </fieldset>
                  </div>
                </Container>
            </fieldset>
        </div>
    )

  }
}

export default AllActivities;
