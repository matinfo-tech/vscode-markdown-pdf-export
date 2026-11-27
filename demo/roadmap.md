---
title: 2027 Roadmap
author: Alex Morgan
client: Northwind Studio
version: 2
pdf:
  orientation: landscape
  footer:
    left_text: "Roadmap, version {version}"
---

# 2027 Roadmap

This document has its own design: the `pdf:` block at the top turns the page to **landscape** and
changes the footer. Everything else still comes from the folder's settings.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#93c5fd", "primaryBorderColor": "#1d4ed8", "primaryTextColor": "#0f172a", "doneTaskBkgColor": "#bfdbfe", "doneTaskBorderColor": "#1d4ed8", "activeTaskBkgColor": "#60a5fa", "activeTaskBorderColor": "#1d4ed8", "taskBkgColor": "#eff6ff", "taskBorderColor": "#93c5fd", "taskTextColor": "#0f172a", "taskTextDarkColor": "#0f172a", "taskTextLightColor": "#0f172a", "taskTextOutsideColor": "#0f172a", "sectionBkgColor": "#f8fafc", "altSectionBkgColor": "#ffffff", "gridColor": "#e2e8f0"}}}%%
gantt
  title Northwind Studio, 2027
  dateFormat YYYY-MM-DD
  axisFormat %b
  section Product
    Invoice page style     :done,   p1, 2027-01-04, 30d
    Templates gallery      :active, p2, after p1, 45d
    Team settings          :        p3, after p2, 40d
  section Platform
    Faster previews        :done,   f1, 2027-01-11, 35d
    Offline fonts          :        f2, after f1, 30d
  section Launch
    Beta                   :milestone, m1, 2027-05-03, 0d
    Release                :milestone, m2, 2027-07-05, 0d
```

| Quarter | Theme       | Goal                              |
|---------|-------------|-----------------------------------|
| Q1      | Polish      | Invoice style, faster previews    |
| Q2      | Teams       | Templates gallery, beta           |
| Q3      | Scale       | Team settings, release            |
