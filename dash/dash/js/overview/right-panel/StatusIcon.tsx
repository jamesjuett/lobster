import React from "react";
import {
  faCheckCircle,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface Props {
  key: string;
  value: {};
}

interface State {}

class StatusIcon extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.getIcon = this.getIcon.bind(this);
    this.getIconColor = this.getIconColor.bind(this);
  }

  getIcon() {
    const {value} = this.props;

    // TODO: Add logic to toggle
    // if (value.something === true) {
    //     return faCheckCircle
    // } else if (value.something === false) {
    //     return faTimesCircle
    // }
    return faCheckCircle
  }

  getIconColor() {
    // TODO: Add logic to toggle
    // if (value.something === true) {
    //     return "text-success"
    // } else if (value.something === false) {
    //     return "text-danger"
    // }
    return "text-success"
  }

  render() {
    return (
        <FontAwesomeIcon icon={this.getIcon()} className={this.getIconColor()} />
    );
  }
}

export default StatusIcon;
