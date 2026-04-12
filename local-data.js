/**
 * Local editable data store.
 *
 * Set `useLocalData` to true to have the app read/write from browser
 * localStorage using the values defined here as the editable seed.
 */
window.LOCAL_APP_DATA = {
  useLocalData: true,
  resetOnLoad: true,
  records: [
    {
      id: "sample-1",
      plateNumber: "ABC1234",
      ownerName: "Sample Visitor",
      phoneNumber: "555-123-4567",
      imageData: null,
      createdAt: 1760000000000,
    },
  ],
  config: {
    adminCredentials: {
      username: "admin",
      password: "-g10hvh",
    },
    apiKey: "",
  },
};
