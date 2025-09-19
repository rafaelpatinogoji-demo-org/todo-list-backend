#!/usr/bin/env python3
"""
MFlix API Client - Python implementation of all GET endpoints
Converts all GET request endpoints from the Node.js mflix-backend API
"""

import requests
import json
from typing import Optional, Dict, Any, List
from urllib.parse import urljoin, urlencode


class MFlixAPIClient:
    """Client for interacting with the MFlix API endpoints"""
    
    def __init__(self, base_url: str = "http://localhost:3000"):
        """
        Initialize the MFlix API client
        
        Args:
            base_url: Base URL of the MFlix API server
        """
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
    
    def _make_request(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Make a GET request to the API
        
        Args:
            endpoint: API endpoint path
            params: Query parameters
            
        Returns:
            JSON response data
            
        Raises:
            requests.RequestException: If the request fails
        """
        url = urljoin(self.base_url, endpoint)
        
        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Request failed for {url}: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Response status: {e.response.status_code}")
                print(f"Response body: {e.response.text}")
            raise
    
    def get_api_info(self) -> Dict[str, Any]:
        """Get API information and available endpoints"""
        return self._make_request('/')
    
    def get_all_movies(self, page: int = 1, limit: int = 10) -> Dict[str, Any]:
        """
        Get all movies with pagination
        
        Args:
            page: Page number (default: 1)
            limit: Number of movies per page (default: 10)
            
        Returns:
            Dictionary containing movies array and pagination info
        """
        params = {'page': page, 'limit': limit}
        return self._make_request('/api/movies', params)
    
    def get_movie_by_id(self, movie_id: str) -> Dict[str, Any]:
        """
        Get a specific movie by ID
        
        Args:
            movie_id: Movie ID
            
        Returns:
            Movie data
        """
        return self._make_request(f'/api/movies/{movie_id}')
    
    def search_movies(self, title: Optional[str] = None, genre: Optional[str] = None, 
                     year: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Search movies by criteria
        
        Args:
            title: Movie title (regex search)
            genre: Movie genre
            year: Movie year
            
        Returns:
            List of matching movies
        """
        params = {}
        if title:
            params['title'] = title
        if genre:
            params['genre'] = genre
        if year:
            params['year'] = year
            
        return self._make_request('/api/movies/search', params)
    
    def get_all_embedded_movies(self, page: int = 1, limit: int = 10) -> Dict[str, Any]:
        """
        Get all embedded movies with pagination
        
        Args:
            page: Page number (default: 1)
            limit: Number of movies per page (default: 10)
            
        Returns:
            Dictionary containing embedded movies array and pagination info
        """
        params = {'page': page, 'limit': limit}
        return self._make_request('/api/embedded-movies', params)
    
    def get_embedded_movie_by_id(self, movie_id: str) -> Dict[str, Any]:
        """
        Get a specific embedded movie by ID
        
        Args:
            movie_id: Embedded movie ID
            
        Returns:
            Embedded movie data
        """
        return self._make_request(f'/api/embedded-movies/{movie_id}')
    
    def search_embedded_movies(self, title: Optional[str] = None, genre: Optional[str] = None, 
                              year: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Search embedded movies by criteria
        
        Args:
            title: Movie title (regex search)
            genre: Movie genre
            year: Movie year
            
        Returns:
            List of matching embedded movies
        """
        params = {}
        if title:
            params['title'] = title
        if genre:
            params['genre'] = genre
        if year:
            params['year'] = year
            
        return self._make_request('/api/embedded-movies/search', params)
    
    def get_all_comments(self, page: int = 1, limit: int = 10) -> Dict[str, Any]:
        """
        Get all comments with pagination
        
        Args:
            page: Page number (default: 1)
            limit: Number of comments per page (default: 10)
            
        Returns:
            Dictionary containing comments array and pagination info
        """
        params = {'page': page, 'limit': limit}
        return self._make_request('/api/comments', params)
    
    def get_comment_by_id(self, comment_id: str) -> Dict[str, Any]:
        """
        Get a specific comment by ID
        
        Args:
            comment_id: Comment ID
            
        Returns:
            Comment data with populated movie info
        """
        return self._make_request(f'/api/comments/{comment_id}')
    
    def get_comments_by_movie(self, movie_id: str) -> List[Dict[str, Any]]:
        """
        Get all comments for a specific movie
        
        Args:
            movie_id: Movie ID
            
        Returns:
            List of comments for the movie
        """
        return self._make_request(f'/api/comments/movie/{movie_id}')
    
    def get_all_users(self, page: int = 1, limit: int = 10) -> Dict[str, Any]:
        """
        Get all users with pagination
        
        Args:
            page: Page number (default: 1)
            limit: Number of users per page (default: 10)
            
        Returns:
            Dictionary containing users array and pagination info
        """
        params = {'page': page, 'limit': limit}
        return self._make_request('/api/users', params)
    
    def get_user_by_id(self, user_id: str) -> Dict[str, Any]:
        """
        Get a specific user by ID
        
        Args:
            user_id: User ID
            
        Returns:
            User data
        """
        return self._make_request(f'/api/users/{user_id}')
    
    def get_all_theaters(self, page: int = 1, limit: int = 10) -> Dict[str, Any]:
        """
        Get all theaters with pagination
        
        Args:
            page: Page number (default: 1)
            limit: Number of theaters per page (default: 10)
            
        Returns:
            Dictionary containing theaters array and pagination info
        """
        params = {'page': page, 'limit': limit}
        return self._make_request('/api/theaters', params)
    
    def get_theater_by_id(self, theater_id: str) -> Dict[str, Any]:
        """
        Get a specific theater by ID
        
        Args:
            theater_id: Theater ID
            
        Returns:
            Theater data
        """
        return self._make_request(f'/api/theaters/{theater_id}')
    
    def get_all_sessions(self, page: int = 1, limit: int = 10) -> Dict[str, Any]:
        """
        Get all sessions with pagination
        
        Args:
            page: Page number (default: 1)
            limit: Number of sessions per page (default: 10)
            
        Returns:
            Dictionary containing sessions array and pagination info
        """
        params = {'page': page, 'limit': limit}
        return self._make_request('/api/sessions', params)
    
    def get_session_by_id(self, session_id: str) -> Dict[str, Any]:
        """
        Get a specific session by ID
        
        Args:
            session_id: Session ID
            
        Returns:
            Session data
        """
        return self._make_request(f'/api/sessions/{session_id}')


def main():
    """Example usage of the MFlix API Client"""
    client = MFlixAPIClient()
    
    print("=== MFlix API Client Demo ===\n")
    
    try:
        print("1. Getting API information...")
        api_info = client.get_api_info()
        print(f"API: {api_info.get('message', 'Unknown')}")
        print(f"Version: {api_info.get('version', 'Unknown')}")
        print(f"Available endpoints: {list(api_info.get('endpoints', {}).keys())}\n")
        
        print("2. Getting first page of movies...")
        movies_response = client.get_all_movies(page=1, limit=5)
        print(f"Total movies: {movies_response.get('totalMovies', 0)}")
        print(f"Current page: {movies_response.get('currentPage', 1)}")
        print(f"Movies on this page: {len(movies_response.get('movies', []))}\n")
        
        print("3. Searching for movies with 'Star' in title...")
        search_results = client.search_movies(title="Star")
        print(f"Found {len(search_results)} movies with 'Star' in title\n")
        
        print("4. Getting first page of embedded movies...")
        embedded_movies = client.get_all_embedded_movies(page=1, limit=3)
        print(f"Total embedded movies: {embedded_movies.get('totalEmbeddedMovies', 0)}")
        print(f"Embedded movies on this page: {len(embedded_movies.get('embeddedMovies', []))}\n")
        
        print("5. Getting first page of comments...")
        comments_response = client.get_all_comments(page=1, limit=3)
        print(f"Total comments: {comments_response.get('totalComments', 0)}")
        print(f"Comments on this page: {len(comments_response.get('comments', []))}\n")
        
        print("6. Getting first page of users...")
        users_response = client.get_all_users(page=1, limit=3)
        print(f"Total users: {users_response.get('totalUsers', 0)}")
        print(f"Users on this page: {len(users_response.get('users', []))}\n")
        
        print("7. Getting first page of theaters...")
        theaters_response = client.get_all_theaters(page=1, limit=3)
        print(f"Total theaters: {theaters_response.get('totalTheaters', 0)}")
        print(f"Theaters on this page: {len(theaters_response.get('theaters', []))}\n")
        
        print("8. Getting first page of sessions...")
        sessions_response = client.get_all_sessions(page=1, limit=3)
        print(f"Total sessions: {sessions_response.get('totalSessions', 0)}")
        print(f"Sessions on this page: {len(sessions_response.get('sessions', []))}\n")
        
        movies = movies_response.get('movies', [])
        if movies:
            movie_id = movies[0].get('_id')
            if movie_id:
                print(f"9. Getting specific movie by ID: {movie_id}")
                specific_movie = client.get_movie_by_id(movie_id)
                print(f"Movie title: {specific_movie.get('title', 'Unknown')}")
                print(f"Movie year: {specific_movie.get('year', 'Unknown')}\n")
                
                print(f"10. Getting comments for movie: {movie_id}")
                movie_comments = client.get_comments_by_movie(movie_id)
                print(f"Comments for this movie: {len(movie_comments)}\n")
        
        print("=== Demo completed successfully! ===")
        
    except requests.RequestException as e:
        print(f"Error connecting to API: {e}")
        print("Make sure the Node.js server is running on http://localhost:3000")
    except Exception as e:
        print(f"Unexpected error: {e}")


if __name__ == "__main__":
    main()
