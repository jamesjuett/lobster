import React from "react";
import { Tab, Row, Col, Nav } from "react-bootstrap";
import ProjectProgress from "./ProjectProgress";

interface Props {
  fileUrl: string;
  eventKey: number;
}

interface State {
  file: string;
}

class FileView extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      file: "",
    };
  }

  componentDidMount() {
    const { fileUrl } = this.props;
    console.log(`This is where I would get the list of files: ${fileUrl}`);
    this.setState({
      file: `I would get the daa from ${fileUrl}`,
    });
    // TODO: fetch file
    // fetch(fileUrl, { credentials: "same-origin" })
    //   .then((response) => {
    //     if (!response.ok) throw Error(response.statusText);
    //     return response.json();
    //   })
    //   .then((data) => {

    //     this.setState({
    //       file: data,
    //     });
    //   });
  }

  render() {
    const { eventKey } = this.props;
    const { file } = this.state;
    return (
      <Tab.Pane eventKey={eventKey}>
        <p>{file}</p>
      </Tab.Pane>
    );
  }
}

export default FileView;
