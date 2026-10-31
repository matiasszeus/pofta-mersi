"use client";

import { Component, type ReactNode } from "react";

// Catches any error from the 3D scene (its code not loading, a font file
// failing, WebGL breaking) so it cannot take the page down: the scene is
// dropped and onError lets the page carry on without it.
export class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
