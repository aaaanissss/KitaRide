// Footer.jsx - Minimal enhanced version
import "./Footer.css";

function Footer() {
    return (
        <footer className="footer-minimal">
            <div className="footer-container">
                <div className="footer-text">
                    <p>&copy; {new Date().getFullYear()} KitaRide. All rights reserved.</p>
                </div>
                <div className="footer-links">
                    <a
                        href="https://myrapid.com.my/wp-content/uploads/2023/03/20230211_integrated_kv_transit_map.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Klang Valley Integrated Transit Map
                    </a>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
