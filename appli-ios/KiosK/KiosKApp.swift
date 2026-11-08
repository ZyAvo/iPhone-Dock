// KiosK — appli iOS d'essai (v71).
// Une coquille : le dock publié (adresse KioskURL de Info.plist) en plein écran dans une vue web.
// - Les pages du dock restent dans l'appli ; tout le reste (autres sites, liens « appli » comme whatsapp:// ou weather://)
//   est confié à iOS : l'appli correspondante s'ouvre, sinon Safari.
// - Pas de pont window.MonEcranNatif pour l'instant (voir outils/dev/APPLIS.md) : les pages marchent comme sur le web.
// - Mémoire de l'appli à part de Safari : favoris et réglages reviennent par la synchronisation (page État).
import SwiftUI
import WebKit
import UIKit

@main
struct KiosKApp: App {
    var body: some Scene {
        WindowGroup {
            DockView().ignoresSafeArea()
        }
    }
}

struct DockView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let conf = WKWebViewConfiguration()
        conf.allowsInlineMediaPlayback = true
        conf.allowsPictureInPictureMediaPlayback = true
        conf.mediaTypesRequiringUserActionForPlayback = []
        conf.websiteDataStore = .default()                   // mémoire gardée d'une ouverture à l'autre

        let web = WKWebView(frame: .zero, configuration: conf)
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        web.allowsBackForwardNavigationGestures = true        // glisser depuis le bord gauche : page précédente
        web.scrollView.contentInsetAdjustmentBehavior = .never // les pages gèrent elles-mêmes l'encoche (viewport-fit=cover)
        web.isOpaque = false
        web.backgroundColor = .systemBackground
        if #available(iOS 16.4, *) { web.isInspectable = true } // inspection possible depuis Safari sur un Mac
        if let url = Coordinator.accueil { web.load(URLRequest(url: url)) }
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        static let accueil: URL? = {
            let s = (Bundle.main.object(forInfoDictionaryKey: "KioskURL") as? String) ?? ""
            return URL(string: s.hasPrefix("https://") ? s : "https://zyavo.github.io/iPhone-Dock/")
        }()

        /// Page du dock (même site, même dossier) ou contenu local : reste dans l'appli.
        private func interne(_ url: URL) -> Bool {
            if ["about", "blob", "data"].contains(url.scheme ?? "") { return true }
            guard let base = Coordinator.accueil else { return false }
            return url.scheme == "https" && url.host == base.host && url.path.hasPrefix(base.path)
        }

        private func ouvrirDehors(_ url: URL) {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else { decisionHandler(.cancel); return }
            if interne(url) { decisionHandler(.allow); return }
            if let cadre = action.targetFrame, !cadre.isMainFrame, ["http", "https"].contains(url.scheme ?? "") {
                decisionHandler(.allow); return                 // cadre intégré dans une page (lecteur, carte…)
            }
            decisionHandler(.cancel)
            ouvrirDehors(url)                                    // autre site ou appli (whatsapp://, weather://…)
        }

        /// Liens « nouvel onglet » (articles, sites) : Safari ou l'appli concernée.
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url {
                if interne(url) { webView.load(action.request) } else { ouvrirDehors(url) }
            }
            return nil
        }

        /// Pas de réseau à l'ouverture : petit message plutôt qu'un écran blanc.
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            let e = error as NSError
            let reseau: Set<Int> = [NSURLErrorNotConnectedToInternet, NSURLErrorNetworkConnectionLost, NSURLErrorTimedOut,
                                    NSURLErrorCannotFindHost, NSURLErrorCannotConnectToHost, NSURLErrorDataNotAllowed]
            guard e.domain == NSURLErrorDomain, reseau.contains(e.code) else { return }   // navigation annulée exprès : rien à dire
            let adresse = Coordinator.accueil?.absoluteString ?? ""
            let html = """
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <body style="font:17px -apple-system,sans-serif;padding:80px 32px;text-align:center;color:#56636f;background:#e7ecef">
            <h2 style="color:#10233a">Pas de réseau</h2><p>Le dock s'ouvrira dès que l'iPhone sera connecté.</p>
            <p><a href="\(adresse)" style="color:#274c77;font-weight:600">Réessayer</a></p></body>
            """
            webView.loadHTMLString(html, baseURL: nil)
        }

        /// La vue web a été arrêtée par iOS (mémoire) : on recharge plutôt que de laisser une page blanche.
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            webView.reload()
        }

        // Fenêtres de la page (« Retirer ta photo ? », messages) en boîtes de dialogue iOS
        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            presenter(message, boutons: [("OK", .default, { completionHandler() })])
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            presenter(message, boutons: [("Annuler", .cancel, { completionHandler(false) }),
                                         ("OK", .default, { completionHandler(true) })])
        }

        private func presenter(_ message: String, boutons: [(String, UIAlertAction.Style, () -> Void)]) {
            let fenetre = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .flatMap { $0.windows }
                .first { $0.isKeyWindow }
            guard var haut = fenetre?.rootViewController else { boutons.first?.2(); return }
            while let p = haut.presentedViewController { haut = p }
            let boite = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            for b in boutons { boite.addAction(UIAlertAction(title: b.0, style: b.1) { _ in b.2() }) }
            haut.present(boite, animated: true)
        }
    }
}
