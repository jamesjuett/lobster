import React from "react";
import { Tab, Row, Col, Nav } from "react-bootstrap";
import FileView from "./FileView";

interface Props {
  fileListUrl: string;
}

interface State {
  fileList: string[];
}

class FileTabs extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      fileList: [],
    };
  }

  componentDidMount() {
    const { fileListUrl } = this.props;
    this.setState({
      fileList: ["file 1", "file 2", "long file 3"],
    });
    // TODO: fetch list of files
    // fetch(fileListUrl, { credentials: "same-origin" })
    //   .then((response) => {
    //     if (!response.ok) throw Error(response.statusText);
    //     return response.json();
    //   })
    //   .then((data) => {

    //     this.setState({
    //       fileList: data,
    //     });
    //   });
  }

  render() {
    const { fileListUrl } = this.props;
    const { fileList } = this.state;
    return (
      <Tab.Container id="individual-code-view-tabs" defaultActiveKey={0}>
        <Row>
          <Col sm={3}>
            <Nav variant="pills" className="flex-column">
              {fileList.map((filename, idx) => (
                <Nav.Item key={idx}>
                  <Nav.Link eventKey={idx}>{filename}</Nav.Link>
                </Nav.Item>
              ))}
            </Nav>
          </Col>
          <Col sm={9}>
            <Tab.Content>
              {fileList.map((filename, idx) => (
                <FileView
                  key={idx}
                  eventKey={idx}
                  fileUrl={`${fileListUrl}${filename}/`}
                />
              ))}
            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>
    );
  }
}

export default FileTabs;
