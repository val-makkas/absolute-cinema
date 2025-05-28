#include "mainwindow.h"
#include <QWebEngineSettings>
#include <QWebEngineProfile>
#include <QUrl>
#include <QVBoxLayout>
#include <QWidget>

MainWindow::MainWindow(QWidget *parent) : QMainWindow(parent)
{
    setupWebView();
}

MainWindow::~MainWindow() {}

void MainWindow::setupWebView()
{
    QWidget *centralWidget = new QWidget(this);
    setCentralWidget(centralWidget);

    QVBoxLayout *layout = new QVBoxLayout(centralWidget);
    layout->setContentsMargins(0, 0, 0, 0);

    webView = new QWebEngineView(this);
    layout->addWidget(webView);

    QWebEngineSettings *settings = webView->settings();
    /* settings->setAttribute(QWebEngineSettings::JavascriptEnabled, true);
    settings->setAttribute(QWebEngineSettings::LocalStorageEnabled, true);
    settings->setAttribute(QWebEngineSettings::LocalContentCanAccessRemoteUrls, true);
    settings->setAttribute(QWebEngineSettings::LocalContentCanAccessFileUrls, true);
    settings->setAttribute(QWebEngineSettings::AllowRunningInsecureContent, true);
    settings->setAttribute(QWebEngineSettings::AllowWindowActivationFromJavaScript, true);

    settings->setAttribute(QWebEngineSettings::AutoLoadImages, true);
    settings->setAttribute(QWebEngineSettings::PluginsEnabled, true);

    settings->setAttribute(QWebEngineSettings::WebGLEnabled, true);
    settings->setAttribute(QWebEngineSettings::Accelerated2dCanvasEnabled, true);
    settings->setAttribute(QWebEngineSettings::HyperlinkAuditingEnabled, false);
    settings->setAttribute(QWebEngineSettings::FocusOnNavigationEnabled, true); */
    
    setWindowTitle("Zync");
    resize(1700, 900);

#ifdef QT_DEBUG
    webView->load(QUrl("http://localhost:5173"));
#else
    webView->load(QUrl("qrc:/web/index.html"));
#endif
}