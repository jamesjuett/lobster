import React from "react";
import moment from "moment";

interface Props {
  startTime: moment.Moment;
}

interface State {
  currentTime: moment.Moment;
  tickIntervalFunc: number;
}

class Timer extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      currentTime: moment(),
      tickIntervalFunc: null,
    };

    this.tick = this.tick.bind(this);
  }

  tick() {
    this.setState((state) => ({
      currentTime: state.currentTime.add(1, "seconds"),
    }));
  }

  componentDidMount() {
    this.setState({
      tickIntervalFunc: setInterval(() => this.tick(), 1000),
    });
  }

  componentWillUnmount() {
    clearInterval(this.state.tickIntervalFunc);
  }

  render() {
    const timeElapsed = moment.duration(
      this.state.currentTime.diff(this.props.startTime)
    );
    const hours = timeElapsed.hours() > 10 ? `${timeElapsed.hours()}` : `0${timeElapsed.hours()}`;
    const minutes = timeElapsed.minutes() > 10 ? `${timeElapsed.minutes()}` : `0${timeElapsed.minutes()}`;
    const seconds = timeElapsed.seconds() > 10 ? `${timeElapsed.seconds()}` : `0${timeElapsed.seconds()}`;

    return `${hours}:${minutes}:${seconds}`;
  }
}

export default Timer;
