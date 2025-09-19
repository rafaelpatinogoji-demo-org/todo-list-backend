# MFlix API Python Client

This Python script provides a complete client implementation for all GET endpoints in the MFlix backend API.

## Overview

The `mflix_api_client.py` script converts all GET request endpoints from the Node.js mflix-backend controllers into equivalent Python requests using the `requests` library.

## Supported Endpoints

### Movies (`/api/movies`)
- `get_all_movies(page=1, limit=10)` - Get paginated list of movies
- `get_movie_by_id(movie_id)` - Get specific movie by ID
- `search_movies(title=None, genre=None, year=None)` - Search movies by criteria

### Embedded Movies (`/api/embedded-movies`)
- `get_all_embedded_movies(page=1, limit=10)` - Get paginated list of embedded movies
- `get_embedded_movie_by_id(movie_id)` - Get specific embedded movie by ID
- `search_embedded_movies(title=None, genre=None, year=None)` - Search embedded movies

### Comments (`/api/comments`)
- `get_all_comments(page=1, limit=10)` - Get paginated list of comments
- `get_comment_by_id(comment_id)` - Get specific comment by ID
- `get_comments_by_movie(movie_id)` - Get all comments for a specific movie

### Users (`/api/users`)
- `get_all_users(page=1, limit=10)` - Get paginated list of users
- `get_user_by_id(user_id)` - Get specific user by ID

### Theaters (`/api/theaters`)
- `get_all_theaters(page=1, limit=10)` - Get paginated list of theaters
- `get_theater_by_id(theater_id)` - Get specific theater by ID

### Sessions (`/api/sessions`)
- `get_all_sessions(page=1, limit=10)` - Get paginated list of sessions
- `get_session_by_id(session_id)` - Get specific session by ID

### API Info (`/`)
- `get_api_info()` - Get API information and available endpoints

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### As a Library

```python
from mflix_api_client import MFlixAPIClient

# Initialize client
client = MFlixAPIClient("http://localhost:3000")

# Get movies with pagination
movies = client.get_all_movies(page=1, limit=20)
print(f"Total movies: {movies['totalMovies']}")

# Search for movies
results = client.search_movies(title="Star", year=1977)
print(f"Found {len(results)} movies")

# Get specific movie
movie = client.get_movie_by_id("573a1390f29313caabcd4323")
print(f"Movie: {movie['title']}")

# Get comments for a movie
comments = client.get_comments_by_movie("573a1390f29313caabcd4323")
print(f"Comments: {len(comments)}")
```

### As a Standalone Script

Run the script directly to see a demonstration of all endpoints:

```bash
python mflix_api_client.py
```

This will test all GET endpoints and display sample data from each one.

## Prerequisites

The Node.js MFlix backend server must be running on `http://localhost:3000`. Start it with:

```bash
npm start
```

## Configuration

The default base URL is `http://localhost:3000`. You can change this when initializing the client:

```python
client = MFlixAPIClient("http://your-server:3000")
```

## Error Handling

The client includes comprehensive error handling:
- Network connection errors
- HTTP status errors (404, 500, etc.)
- JSON parsing errors
- Detailed error messages with response information

## Pagination

All list endpoints support pagination with these parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

## Search Parameters

Movie and embedded movie search endpoints support:
- `title`: Regex search on movie title
- `genre`: Exact match on movie genre
- `year`: Exact match on movie year

## Response Format

The client returns the same JSON response structure as the original Node.js API:

```python
# Paginated responses
{
    "movies": [...],
    "currentPage": 1,
    "totalPages": 10,
    "totalMovies": 100
}

# Search responses
[
    {"_id": "...", "title": "...", "year": 1977},
    ...
]

# Individual resources
{
    "_id": "...",
    "title": "Star Wars",
    "year": 1977,
    ...
}
```
