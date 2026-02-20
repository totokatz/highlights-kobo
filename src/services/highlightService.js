import axios from "axios";
const baseUrl = "/api/highlights";

const getAll = async () => {
  const response = await axios.get(baseUrl);
  return response.data;
};

const postHighlights = async (content) => {
  console.log("Frontend Axios content: ", content.documents);
  const response = await axios.post(
    baseUrl,
    { documents: content.documents },
    {
      headers: { "Content-Type": "application/json" },
    }
  );
  return response.data;
};

const toggleStarred = async (docId, entryId, starred) => {
  const response = await axios.patch(`${baseUrl}/${docId}/entries/${entryId}/star`, {
    starred,
  });
  return response.data;
};

export default { getAll, postHighlights, toggleStarred };
