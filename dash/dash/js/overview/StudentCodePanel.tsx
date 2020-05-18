import React from "react";
import { Tabs, Tab, CardColumns } from "react-bootstrap";
import CodeFiles from "./CodeFiles";
import CodeCard from "./CodeCard";
import CloseButton from "./CloseButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { Nav, Button } from "react-bootstrap";

class CodeViewer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      student_list: [],
      student_set: new Set(),
      currentTab: "student-solutions",
    };

    this.onCardClick = this.onCardClick.bind(this);
    this.selectTab = this.selectTab.bind(this);
  }

  onCardClick(uniqname) {
    if (!this.state.student_set.has(uniqname)) {
      this.setState((prevState) => ({
        student_list: prevState.student_list.concat([uniqname]),
        student_set: prevState.student_set.add(uniqname),
        currentTab: uniqname,
      }));
    } else {
      this.setState(() => ({
        currentTab: uniqname,
      }));
    }
  }

  selectTab(tabId) {
    this.setState(() => ({
      currentTab: tabId,
    }));
  }

  closeTab(uniqname) {
    const index = this.state.student_list.indexOf(uniqname);
    if (index > -1) {
      this.setState((prevState) => ({
        student_list: prevState.student_list.splice(index, 1),
        student_set: prevState.student_set.remove(uniqname),
      }));
    }
  }

  render() {
    const { student_list, currentTab } = this.state;

    return (
          <div className="flex-grow-1 overflow-auto">
            <CardColumns className="pt-2">
              <CodeCard uniqname={"cmfh"} onClick={this.onCardClick} />
              <CodeCard uniqname={"cmfh2"} onClick={this.onCardClick} />
              <CodeCard uniqname={"cmfh3"} onClick={this.onCardClick} />
              <CodeCard uniqname={"cmfh4"} onClick={this.onCardClick} />
              <CodeCard uniqname={"cmfh5"} onClick={this.onCardClick} />
              <CodeCard uniqname={"cmfh6"} onClick={this.onCardClick} />
              <CodeCard uniqname={"cmfh7"} onClick={this.onCardClick} />
              <CodeCard uniqname={"cmfh8"} onClick={this.onCardClick} />
              <CodeCard uniqname={"cmfh9"} onClick={this.onCardClick} />
              <CodeCard uniqname={"cmfh10"} onClick={this.onCardClick} />
            </CardColumns>
          </div>
    );
  }
}

export default CodeViewer;
