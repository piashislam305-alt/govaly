import React from 'react';
import { ServerError } from '../pages/Errors.jsx';

/** Class error-boundary — renders the Govaly 500 design when React crashes. */
export default class ErrorBoundary extends React.Component {
  state = { err: null };

  static getDerivedStateFromError(err) {
    return { err };
  }

  componentDidCatch(err, info) {
    console.error('[govaly] UI crash:', err, info?.componentStack);
  }

  render() {
    if (this.state.err) return <ServerError />;
    return this.props.children;
  }
}
