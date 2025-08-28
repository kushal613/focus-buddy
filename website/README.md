# Focus Warmup Website

A modern, responsive marketing website for the Focus Warmup Chrome extension. Built with vanilla HTML, CSS, and JavaScript to showcase the extension's features, explain the underlying science, and drive user adoption.

## 🚀 Features

### Design & UX
- **Modern, Clean Design** - Aligns with the extension's aesthetic using consistent color schemes and typography
- **Fully Responsive** - Optimized for desktop, tablet, and mobile devices
- **Smooth Animations** - Intersection Observer animations and parallax effects
- **Interactive Elements** - Hover effects, button animations, and demo interactions

### Content Sections
- **Hero Section** - Clear value proposition with interactive demo card
- **Problem Statement** - Explains the distraction problem and its impact
- **Scientific Foundation** - Details the cognitive science and research behind the approach
- **How It Works** - Step-by-step workflow explanation
- **Feature Showcase** - Comprehensive feature breakdown
- **Installation CTA** - Clear call-to-action with benefits and statistics

### Technical Features
- **SEO Optimized** - Proper meta tags, semantic HTML, and structured content
- **Performance Focused** - Optimized images, minimal dependencies, fast loading
- **Accessibility** - ARIA labels, keyboard navigation, and screen reader support
- **Cross-browser Compatible** - Works on all modern browsers

## 🛠️ Setup & Development

### Prerequisites
- A modern web browser
- Basic knowledge of HTML, CSS, and JavaScript
- A web server (for local development)

### Local Development

1. **Clone or download the website files**
   ```bash
   # If using git
   git clone <repository-url>
   cd website
   
   # Or simply download the files to a folder
   ```

2. **Start a local server**
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

### File Structure
```
website/
├── index.html          # Main HTML file
├── styles.css          # All CSS styles
├── script.js           # JavaScript functionality
├── README.md           # This file
└── assets/             # Images and other assets (if any)
```

## 🎨 Customization

### Colors & Theme
The website uses CSS custom properties for easy theming. Edit the `:root` variables in `styles.css`:

```css
:root {
  --primary: #3b82f6;        /* Main brand color */
  --accent: #8b5cf6;         /* Secondary accent color */
  --text: #1e293b;           /* Primary text color */
  --text-secondary: #64748b; /* Secondary text color */
  /* ... more variables */
}
```

### Content Updates
- **Text Content**: Edit the HTML directly in `index.html`
- **Images**: Replace images in the `assets/` folder
- **Links**: Update Chrome Web Store link and social media links
- **Statistics**: Modify the numbers in the stats sections

### Adding New Sections
1. Add HTML structure to `index.html`
2. Add corresponding CSS styles to `styles.css`
3. Add any JavaScript functionality to `script.js`

## 📱 Responsive Design

The website is built with a mobile-first approach and includes breakpoints for:
- **Desktop**: 1200px and above
- **Tablet**: 768px to 1199px
- **Mobile**: Below 768px
- **Small Mobile**: Below 480px

## 🚀 Deployment

### Static Hosting Options

#### Netlify (Recommended)
1. Connect your repository to Netlify
2. Set build command: `none` (static site)
3. Set publish directory: `website/`
4. Deploy automatically on git push

#### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the website directory
3. Follow the prompts

#### GitHub Pages
1. Push code to GitHub repository
2. Go to Settings > Pages
3. Select source branch and folder
4. Enable GitHub Pages

#### Traditional Web Hosting
1. Upload all files to your web server
2. Ensure `index.html` is in the root directory
3. Configure domain and SSL certificate

### SEO & Analytics

#### Google Analytics
Add this before the closing `</head>` tag:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

#### Meta Tags
Update the meta tags in `index.html` for your specific domain and content.

## 🔧 Maintenance

### Regular Updates
- **Content**: Update statistics, testimonials, and feature descriptions
- **Links**: Keep Chrome Web Store and social media links current
- **Performance**: Monitor loading times and optimize images
- **Analytics**: Review user behavior and conversion rates

### Performance Optimization
- Compress images using tools like TinyPNG
- Minify CSS and JavaScript for production
- Enable gzip compression on your server
- Use a CDN for faster global delivery

## 📄 License

This website is part of the Focus Warmup project. Please refer to the main project license for usage terms.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For questions about the website or Focus Warmup extension:
- **Email**: support@focuswarmup.com
- **GitHub**: https://github.com/your-repo
- **Documentation**: Check the main project README

---

Built with ❤️ for productive minds.
