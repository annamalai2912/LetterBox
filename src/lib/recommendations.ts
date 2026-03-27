export interface Recommendation {
  id: string;
  name: string;
  description: string;
  category: string;
  url: string;
}

export const NEWSLETTER_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'pragmatic-eng',
    name: 'The Pragmatic Engineer',
    description: 'High-fidelity insights for software engineers and managers. The #1 tech newsletter on Substack.',
    category: 'Tech',
    url: 'https://blog.pragmaticengineer.com/'
  },
  {
    id: 'tldr-tech',
    name: 'TLDR',
    description: 'Bite-sized daily updates on tech, science, and coding. 5 minutes or less.',
    category: 'Tech',
    url: 'https://tldr.tech/'
  },
  {
    id: 'superhuman',
    name: 'Superhuman',
    description: 'Learn how to leverage AI to boost your productivity. The fastest-growing AI newsletter.',
    category: 'AI/Intelligence',
    url: 'https://www.superhuman.ai/'
  },
  {
    id: 'morning-brew',
    name: 'Morning Brew',
    description: 'Become smarter in 5 minutes. The daily email that makes reading the news actually enjoyable.',
    category: 'Business',
    url: 'https://www.morningbrew.com/daily'
  },
  {
    id: 'the-hustle',
    name: 'The Hustle',
    description: 'Daily business and tech news that makes you smarter and more successful.',
    category: 'Business',
    url: 'https://thehustle.co/'
  },
  {
    id: 'marketing-brew',
    name: 'Marketing Brew',
    description: 'Daily marketing news and analysis. Your cheat sheet for the modern brand builder.',
    category: 'Marketing',
    url: 'https://www.marketingbrew.com/'
  },
  {
    id: 'lennys-newsletter',
    name: 'Lenny\'s Newsletter',
    description: 'Practical advice on product, growth, and careers. The #1 business newsletter on Substack.',
    category: 'Product',
    url: 'https://www.lennysnewsletter.com/'
  },
  {
    id: 'refactoring',
    name: 'Refactoring',
    description: 'Weekly advice on writing better code and scaling tech teams.',
    category: 'Tech',
    url: 'https://refactoring.guru/'
  },
  {
    id: 'the-rundown',
    name: 'The Rundown AI',
    description: 'The latest AI news and tools to stay ahead of the curve.',
    category: 'AI/Intelligence',
    url: 'https://www.therundown.ai/'
  }
];
