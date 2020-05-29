import React from "react";
import { Tab, Row, Col, Nav } from "react-bootstrap";
import FileView from "./FileView";

interface Props {
  baseUrl: string;
  fileList: string[];
}

interface State {}

class FileTabs extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
  }

  render() {
    const { fileList, baseUrl } = this.props;

    const fullSizeLayout = (
      <Row className="h-100 d-none d-sm-flex">
        <Col sm={3} className="d-flex flex-column h-100">
          <Nav variant="pills" className="flex-column overflow-auto">
            {fileList.map((filename, idx) => (
              <Nav.Item key={idx}>
                <Nav.Link eventKey={idx}>{filename}</Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        </Col>
        <Col sm={9} className="d-flex flex-column h-100">
          <Tab.Content>
            {fileList.map((filename, idx) => (
              <FileView key={idx} eventKey={idx} fileUrl={baseUrl + filename} />
            ))}
          </Tab.Content>
        </Col>
      </Row>
    );

    const smallLayout = (
      <Row className="h-100 d-xs-flex d-sm-none">
        <Col sm={3} className="d-flex flex-column h-25">
          <Nav variant="pills" className="flex-column overflow-auto">
            {fileList.map((filename, idx) => (
              <Nav.Item key={idx}>
                <Nav.Link eventKey={idx}>{filename}</Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        </Col>
        <Col sm={9} className="d-flex flex-column h-75">
          <Tab.Content>
            {fileList.map((filename, idx) => (
              <FileView key={idx} eventKey={idx} fileUrl={baseUrl + filename} />
            ))}
          </Tab.Content>
        </Col>
      </Row>
    );



    return (
      <Tab.Container id="individual-code-view-tabs" transition={false} defaultActiveKey={0}>
        {fullSizeLayout}
        {smallLayout}
      </Tab.Container>
    );
  }
}

export default FileTabs;
