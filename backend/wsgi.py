from app import create_app

application = create_app()

if __name__ == "__main__":
    from app.config import Config
    application.run(debug=Config.DEBUG, host="0.0.0.0", port=5000)
