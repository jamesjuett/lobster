import React from "react";
import { Tab } from "react-bootstrap";

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

    this.getFileInfo = this.getFileInfo.bind(this);
  }

  componentDidMount() {
    this.getFileInfo();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.fileUrl !== this.props.fileUrl) {
      this.getFileInfo();
    }
  }

  getFileInfo() {
    const { fileUrl } = this.props;
    this.setState({
      file: `I am file ${fileUrl}`,
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
