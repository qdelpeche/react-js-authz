import React, { useEffect, useState } from "react";
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal, useIsAuthenticated } from "@azure/msal-react";
import axios from "axios";
import './App.css';

function App() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [claims, setClaims] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  const [error, setError] = useState(null);

  const login = () => instance.loginRedirect();
  const logout = () => instance.logoutRedirect();

  // Set active account when accounts are available
  useEffect(() => {
    if (accounts.length > 0) {
      instance.setActiveAccount(accounts[0]); // Set the first account as active
    }
  }, [accounts, instance]);

  useEffect(() => {
    const fetchToken = async () => {
      if (isAuthenticated) {  // Only attempt to acquire token if authenticated
        try {
          const response = await instance.acquireTokenSilent({
            scopes: ["openid", "profile", "User.Read"], // Ensure these scopes are granted
          });
          console.log("Access Token:", response.accessToken);
          setClaims(response.idTokenClaims); // Set claims to state
          console.log("ID Token Claims:", response.idTokenClaims); // Log claims to console
        } catch (error) {
          console.error("Error acquiring token silently:", error);
        }
      }
    };
    fetchToken();
  }, [instance, isAuthenticated]); // Run only when authenticated

  const callApi = async (endpoint) => {
    try {
      // Get the token with the required API scope
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ["api://<CLIENT_ID_URI>/User.Read"], // Replace with your API scope
      });

      // Make the API call with Axios
      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`, // Pass the token here
        },
      });
      setApiResponse(response.data); // Handle successful response
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error("Error calling API:", err);
      if (err.response) {
        if (err.response.status === 401) {
          setError("Unauthorized: Please check your permissions.");
        } else if (err.response.status === 403) {
          setError("Forbidden: Access is denied.");
        } else {
          setError(err.response.data);
        }
      } else {
        setError("Network error or API is unavailable.");
      }
    }
  };

  return (
      <div className="App">
        <UnauthenticatedTemplate>
          <h2>Welcome guest, you are not logged in!</h2>
          <button onClick={login}>Sign in</button>
          <h3>These will error out as you are not authorized.</h3>
        </UnauthenticatedTemplate>
        <AuthenticatedTemplate>
          <h2>Welcome {claims?.name || claims?.preferred_username || "User"}, you are logged in!</h2>
          <button onClick={logout}>Sign out</button>
          <ul>
            {claims &&
                Object.entries(claims).map(([key, value]) => (
                    <li key={key}>
                      <strong>{key}:</strong> {value.toString()}
                    </li>
                ))}
          </ul>
          <h3>These will now work as you are authorized.</h3>
        </AuthenticatedTemplate>
        <div>
          <button onClick={() => callApi("http://localhost:5086/api/NoScope")}>Call No Scope</button>&nbsp;
          <button onClick={() => callApi("http://localhost:5086/api/RequiredScope")}>Call Required Scope</button>&nbsp;
        </div>
        <div>
          {apiResponse && (
              <div>
                <hr/>
                <h3>API Response:</h3>
                <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
              </div>
          )}

          {error && (
              <div style={{ color: "red" }}>
                <hr/>
                <h3>Error:</h3>
                <pre>{JSON.stringify(error, null, 2)}</pre>
              </div>
          )}
        </div>
        <hr/>
        <ul>
          <li><a href="https://learn.microsoft.com/en-us/samples/azure-samples/ms-identity-ciam-javascript-tutorial/ms-identity-ciam-javascript-tutorial-1-sign-in-react/">React single-page application using MSAL React to authenticate users against Microsoft Entra External ID</a></li>
          <li><a href="https://learn.microsoft.com/en-us/entra/external-id/customers/tutorial-single-page-app-react-sign-in-configure-authentication">Tutorial: Handle authentication flows in a React SPA</a></li>
          <li><a href="https://blog.logrocket.com/using-msal-react-authentication/">Using msal-react for React app authentication</a></li>
          <li><a href="https://learn.microsoft.com/en-us/entra/external-id/customers/sample-single-page-app-react-sign-in">Sign in users in a sample React single-page app (SPA)</a></li>
        </ul>
      </div>
  );
}

export default App;
