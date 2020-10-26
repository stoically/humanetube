import "setimmediate";
import "rsuite/lib/styles/themes/dark/index.less";
import React from "react";
import ReactDOM from "react-dom";
import { Youtube } from "./components/Youtube";

const App = <Youtube />;

ReactDOM.render(App, document.getElementById("app"));
