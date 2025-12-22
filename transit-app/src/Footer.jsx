// Footer.jsx - Minimal enhanced version
import "./Footer.css";

function Footer() {
    return (
        <footer className="footer-minimal">
            <div className="footer-container">
                <div className="footer-text">
                    <p>&copy; {new Date().getFullYear()} Transit App. All rights reserved.</p>
                </div>
                <div className="footer-links">
                    <a href="/privacy">Privacy</a>
                    <a href="/terms">Terms</a>
                    <a href="/contact">Contact</a>
                </div>
            </div>
        </footer>
    );
}

export default Footer;