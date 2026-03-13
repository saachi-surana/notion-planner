const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const APP_DATA_DIR = path.join(require('os').homedir(), '.notion-planner');

function getConfig() {
  const configPath = path.join(APP_DATA_DIR, 'config.json');
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

function getNotionToken() {
  const config = getConfig();
  return config.notionToken || process.env.NOTION_TOKEN;
}

function getTasksDbId() {
  const config = getConfig();
  return config.notionTasksDbId || process.env.NOTION_TASKS_DB_ID;
}

function getNotesDbId() {
  const config = getConfig();
  return config.notionNotesDbId || process.env.NOTION_NOTES_DB_ID;
}

function notionClient() {
  const token = getNotionToken();
  if (!token) throw new Error('Notion token not configured');
  return axios.create({
    baseURL: 'https://api.notion.com/v1',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    }
  });
}

async function addTask(task) {
  const dbId = getTasksDbId();
  if (!dbId) return null;

  const client = notionClient();
  const today = new Date().toISOString().split('T')[0];

  await client.post('/pages', {
    parent: { database_id: dbId },
    properties: {
      Name: {
        title: [{ text: { content: task.text } }]
      },
      Done: {
        checkbox: false
      },
      Date: {
        date: { start: today }
      }
    }
  });
}

async function toggleTask(task) {
  const dbId = getTasksDbId();
  if (!dbId) return null;

  // We need to find the Notion page by task text + date to update it
  // For simplicity, store the notion_page_id in a local lookup or re-query
  // Here we'll query Notion for matching pages
  const client = notionClient();
  const today = new Date().toISOString().split('T')[0];

  try {
    const response = await client.post(`/databases/${dbId}/query`, {
      filter: {
        and: [
          {
            property: 'Name',
            title: { equals: task.text }
          },
          {
            property: 'Date',
            date: { equals: today }
          }
        ]
      }
    });

    const pages = response.data.results;
    if (pages.length === 0) return null;

    const pageId = pages[0].id;
    await client.patch(`/pages/${pageId}`, {
      properties: {
        Done: { checkbox: task.done }
      }
    });
  } catch (e) {
    console.error('Notion toggle error:', e.message);
  }
}

async function quickAdd(title, body) {
  const dbId = getNotesDbId();
  if (!dbId) return { error: 'Notion Quick Notes database not configured' };

  const client = notionClient();

  const children = body ? [
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: body } }]
      }
    }
  ] : [];

  const response = await client.post('/pages', {
    parent: { database_id: dbId },
    properties: {
      Name: {
        title: [{ text: { content: title } }]
      }
    },
    children
  });

  return { success: true, id: response.data.id };
}

module.exports = { addTask, toggleTask, quickAdd };
