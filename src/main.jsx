import React from "react";
import ReactDOM from "react-dom/client";
import { configureStore } from "@reduxjs/toolkit";

import { Provider } from "react-redux";

import App from "./App";
import highlights from "./reducers/highlightsReducer";
import filter from "./reducers/filterReducer";
import { ThemeProvider } from "./context/ThemeContext";

const store = configureStore({
  reducer: {
    highlights: highlights,
    filter: filter,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </Provider>,
);
