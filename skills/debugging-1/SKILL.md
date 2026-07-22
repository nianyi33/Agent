---
name: Debugging
description: Systematic debugging method �?reproduce first, list 3 ranked falsifiable hypotheses, change ONE variable at a time, stop after fixing.
tags:
  - debugging
  - diagnose
  - fix
  - bug
  - error
aliases:
  - debugging discipline
  - diagnose
  - root cause
triggers:
  - debug
  - bug
  - 报错
  - 出错
  - 坏了
  - 崩溃
  - 打不开
  - 不工�?  - 修一�?  - 修复
  - 排查
  - not working
  - broken
  - fix this
---

# Debugging Discipline

## 1. Build a feedback loop first
Construct a repeatable pass/fail check that reproduces the symptom. A reliable loop is 90% of the fix.

## 2. Reproduce before you hypothesize
Run the loop and watch it fail the way described. If you cannot reproduce it, say so �?do not guess-fix.

## 3. List 3 ranked, falsifiable hypotheses
Each must predict: "if X is the cause, changing Y makes the symptom disappear."

## 4. Change ONE thing at a time
Test after each change. If you change three things and it works, you don't know which one fixed it.

## 5. The fix is proven only when the loop flips to pass
The original symptom, not a nearby one.

## 6. Never retry the same failing approach
Same thing, different hope is not debugging. After two failures: report and ask.
