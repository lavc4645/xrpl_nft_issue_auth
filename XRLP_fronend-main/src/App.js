import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Data from "./Data";
import Purchase from "./Purchase";



function App() {
  return (
    <Router>
    <Routes>
        <Route exact path={"/"} element={<Data/>} />
        <Route exact path={"/data"} element={<Data/>} />
        <Route exact path={"/purchase"} element={<Purchase />}></Route>
        </Routes>
    </Router>
  );
}

export default App;
