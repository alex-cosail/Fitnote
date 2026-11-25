import { CatalogText } from '../domain/catalog/types';

// English texts of the catalog, by exercise id. Missing ids fall back (catalogTexts.ts).
export const CATALOG_TEXT_EN: Record<string, CatalogText> = {
  "knee-push-ups": {
    name: "Knee Push-Ups",
    cue: "Knees on the mat, straight line from knees to shoulders, elbows at 45°.",
    details:
      "Start in a kneeling plank with hands slightly wider than shoulder-width and brace your glutes and core. Inhale and lower your chest under control until just above the mat with elbows angled at 45°. Exhale and press back up while keeping the torso rigid. Avoid letting the hips sag or breaking at the waist.",
  },
  "incline-push-ups": {
    name: "Incline Push-Ups",
    cue: "Hands on a bench or couch, body in a rigid line, elbows tucked at 45°.",
    details:
      "Place your hands on a low bench, bar, or couch edge and step back into a straight plank from heels to head. Inhale as you bend your elbows at 45° and lower your lower chest toward the support. Exhale and press back up while keeping your shoulders down away from your ears. Avoid leading with the chin or letting the lower back sag.",
  },
  "feet-elevated-push-ups": {
    name: "Feet-Elevated Push-Ups",
    cue: "Feet on a bench or stall bar, core braced tight, lower chest to hand line.",
    details:
      "Place your toes on a couch, bench, or stall bar while keeping your hands under your shoulders on the mat or low bar. Brace your abs and glutes firmly so your lower back stays neutral. Inhale to lower your upper chest toward the hand line with elbows at 45°, then exhale to press up. Avoid letting your hips drop or flaring your elbows wide.",
  },
  "banded-push-ups": {
    name: "Banded Push-Ups",
    cue: "Band across upper back and under palms, press strongly without shrugging.",
    details:
      "Loop a resistance band across your shoulder blades and pin both ends under your palms on a mat or low bench. Set a rigid plank with shoulders packed away from your ears. Inhale to lower under control, then exhale and drive through increasing band tension to full lockout. Avoid letting the band slide onto your neck or sagging at the waist.",
  },
  "suspension-push-ups": {
    name: "Suspension Push-Ups",
    cue: "Horizontal or angled body in straps, keep straps just clear of forearms.",
    details:
      "Grip the suspension handles on your toes with your body braced in a straight line and hands slightly clear so straps do not rub your forearms. Stabilize your shoulder blades before bending the elbows. Inhale to lower your chest smoothly between the handles, then exhale and press back to center. Avoid letting your hips sag or shoulders roll forward.",
  },
  "archer-push-ups": {
    name: "Archer Push-Ups",
    cue: "Wide hand stance, shift weight onto one working arm while keeping the other straight.",
    details:
      "Set your hands much wider than shoulder-width on a mat or long low bench with fingers angled slightly outward. Inhale and shift your chest toward one hand while extending the opposite arm straight out. Exhale and press forcefully back to the center without twisting your pelvis. Avoid collapsing the lower back or bending the straight assist arm.",
  },
  "scapular-wall-slides": {
    name: "Scapular Wall Slides",
    cue: "Keep lower back flat against wall or post, slide forearms upward without shrugging.",
    details:
      "Stand with your back against a wall or upright post, knees slightly bent, pressing your lower back, shoulder blades, and head gently in. Form a W shape with elbows and backs of wrists touching the support. Exhale to glide your arms smoothly upward into a Y without flaring your ribs, then inhale back down. Avoid arching your lower back or lifting your wrists away.",
  },
  "incline-pike-push-ups": {
    name: "Incline Pike Push-Ups",
    cue: "Hands on couch or bench, hips piked high, lower head forward ahead of hands.",
    details:
      "Place your hands on a couch or low bench and lift your hips high into an inverted V on your toes. Inhale as you bend elbows back at 45° and guide the top of your head forward just past the bench edge. Exhale and press back along the same diagonal arc. Avoid flaring your elbows wide or dropping your forehead straight between your palms.",
  },
  "band-overhead-press": {
    name: "Band Overhead Press",
    cue: "Stand on the band, press overhead with ribs down and no lower-back arch.",
    details:
      "Step firmly on the resistance band with both feet and hold the top edge at collarbone level with elbows angled slightly forward. Brace your abs and glutes to lock your ribcage down. Exhale to press straight overhead until elbows lock softly, then inhale back to shoulders. Avoid leaning back or flaring your ribs.",
  },
  "half-kneeling-db-press": {
    name: "Half-Kneeling Dumbbell Press",
    cue: "Kneel on the pressing-side knee, squeeze glute and core, press straight overhead.",
    details:
      "Set into a half-kneeling stance with the dumbbell on the same side as your down knee and your elbow angled 30° forward. Squeeze the back glute and brace your abs to keep your torso upright. Exhale to press the dumbbell straight overhead toward your ear, then inhale down over two seconds. Avoid arching the lower back or leaning sideways.",
  },
  "elevated-pike-push-ups": {
    name: "Elevated Pike Push-Ups",
    cue: "Feet on couch or bench, torso nearly vertical, lower crown ahead of hands.",
    details:
      "Place your toes on a couch, bench, or stall bar and walk your hands back until your hips stack almost vertically over your shoulders. Inhale to bend your elbows back at 45° and lower your head forward ahead of your hand line. Exhale and press straight up to full shoulder elevation. Avoid flattening your torso into a regular push-up angle.",
  },
  "wall-handstand-hold": {
    name: "Wall Handstand Hold",
    cue: "Chest-to-wall alignment, push the floor away actively, keep ribs tucked.",
    details:
      "Start in a plank with feet against the wall and walk your feet up while stepping hands smoothly to 20–30 cm from the wall. Tuck your ribs, squeeze glutes, and push tall through your shoulders. Breathe steadily and step down to one side before fatigue compromises control. Avoid letting the lower back arch into a banana shape or holding your breath.",
  },
  "prone-ywt-raises": {
    name: "Prone Y-W-T Raises",
    cue: "Face down on mat, forehead resting, squeeze shoulder blades with thumbs up.",
    details:
      "Lie face down on your mat with forehead resting lightly and abs slightly braced to protect your lower back. Lift your arms sequentially into Y, W, and T shapes with thumbs pointing up, pausing one second at the top. Exhale as you lift and inhale as you lower smoothly. Avoid craning your neck or shrugging your upper traps.",
  },
  "seated-band-row": {
    name: "Seated Band Row",
    cue: "Seated upright with band looped around midfoot, pull elbows to lower ribs.",
    details:
      "Sit tall on a mat or bench with knees slightly bent and loop the band securely around your midfeet. Lengthen your spine and drop your shoulders away from your ears. Exhale to retract your shoulder blades and row your hands to your lower ribs for a one-second pause, then inhale back slowly. Avoid rounding your lower back or rocking backward.",
  },
  "single-arm-db-row": {
    name: "Single-Arm Dumbbell Row",
    cue: "Support one hand on couch or bench, flat back, sweep dumbbell toward your hip.",
    details:
      "Place your free hand firmly on a couch, low bench, or low bar with feet staggered for stability and your back flat. Exhale and sweep the dumbbell back in an arc toward your hip pocket while squeezing your shoulder blade inward. Inhale to lower over two seconds without letting your torso twist. Avoid rotating your chest upward or pulling straight into the armpit.",
  },
  "suspension-row": {
    name: "Suspension Row",
    cue: "Rigid plank in straps, pull chest toward handles while rotating palms toward ribs.",
    details:
      "Grip the suspension handles and walk your feet forward onto your heels to set your desired angle, keeping abs and glutes tight. Exhale to pull your chest to your hands while rotating your palms neutral and squeezing your shoulder blades. Inhale to lower under control without shrugging. Avoid letting the hips sag or jutting the chin forward.",
  },
  "band-face-pull": {
    name: "Band Face Pull",
    cue: "Anchor band at eye level, pull toward forehead while externally rotating wrists.",
    details:
      "Anchor the band to a stall bar or post at eye level and step back into a staggered stance. Exhale to pull the band toward your forehead, keeping elbows high and rotating thumbs backward into external rotation. Hold for one second and return smoothly. Avoid leaning back through the lower spine or dropping the elbows.",
  },
  "feet-elevated-australian-pull-ups": {
    name: "Feet-Elevated Australian Pull-Ups",
    cue: "Heels on bench or stall bar, horizontal body line, pull chest all the way to bar.",
    details:
      "Grip a low bar overhand at shoulder-width and place your heels on a low bench or stall bar matching hand height. Lock your hips and core into a straight horizontal plank. Exhale to pull your chest to the bar by squeezing your shoulder blades together, then inhale down for two seconds. Avoid cutting the range short or letting the hips sag.",
  },
  "split-stance-explosive-band-row": {
    name: "Split-Stance Explosive Single-Arm Band Row",
    cue: "Split stance, band under front foot or post: explosive one-arm pull with zero torso twist.",
    details:
      "Set into a low athletic split stance with the band anchored under your front foot at home or on a stall bar outdoors. Brace your abs and obliques tightly to block rotational twist. Exhale sharply to drive one elbow explosively back to your lower ribcage in half a second, then control the return for two seconds. Avoid whipping the lower back or letting the shoulder snap forward.",
  },
  "suspension-single-arm-row": {
    name: "Single-Arm Suspension Row",
    cue: "One hand in the strap, keep shoulders and hips square with zero torso rotation.",
    details:
      "Hold one suspension handle with feet wide or staggered on your heels to resist twisting, keeping your free hand at your side. Exhale to pull your chest up toward the working hand while keeping both shoulders level. Inhale to lower smoothly without rotating open at the bottom. Avoid twisting your torso to cheat the top of the rep.",
  },
  "scapular-pull-ups": {
    name: "Scapular Pull-Ups",
    cue: "Keep elbows locked straight, lift body purely by depressing shoulder blades down.",
    details:
      "Hang from a pull-up bar with an overhand shoulder-width grip, legs slightly in front, and elbows completely straight. Exhale to pull your shoulder blades down and back, lifting your chest 5–10 cm for a one-second pause. Inhale smoothly back into a controlled hang. Avoid bending your elbows or arching your lower back.",
  },
  "negative-pull-ups": {
    name: "Negative Pull-Ups",
    cue: "Step from bench or stall bar to chin-over-bar, lower smoothly over 4–5 seconds.",
    details:
      "Use a low bench or stall bar step to enter the top pull-up position smoothly with your chin above the bar and core braced. Pause one second at the top, then inhale while lowering yourself steadily over 4–5 seconds to near full arm extension. Avoid dropping fast through the bottom half of the descent.",
  },
  "band-assisted-pull-ups": {
    name: "Band-Assisted Pull-Ups",
    cue: "Loop band over bar under foot or knee, pull chest upward with zero swinging.",
    details:
      "Girth-hitch a resistance band to the bar and step one foot or knee securely into the loop, crossing your other ankle over it. Depress your shoulder blades first, then exhale and pull your chin over the bar with a braced core. Inhale to lower smoothly over two seconds. Avoid letting the band swing your legs forward.",
  },
  "chin-ups": {
    name: "Chin-Ups",
    cue: "Underhand shoulder-width grip, drive elbows down toward ribs, chest to the bar.",
    details:
      "Grip the bar palms-facing-you at shoulder width or slightly narrower with legs slightly forward and core braced. Exhale to depress your shoulder blades and drive your elbows straight down until your chin clears the bar. Inhale to lower smoothly over two seconds without rounding your shoulders forward. Avoid craning your neck upward to reach the bar.",
  },
  "chest-to-bar-pull-ups": {
    name: "Chest-to-Bar Pull-Ups",
    cue: "Explosive scapular drive, lean back slightly at top to touch sternum to bar.",
    details:
      "Grip the bar just outside shoulder-width with a braced hollow body. Exhale forcefully to pull explosively upward, leaning your torso slightly back in the top third and pinching shoulder blades until your upper chest touches the bar. Inhale to lower strictly over two seconds. Avoid rolling your shoulders forward or kipping with the legs.",
  },
  "archer-pull-ups": {
    name: "Archer Pull-Ups",
    cue: "Wide grip, pull chest toward one hand while keeping the assist arm straight.",
    details:
      "Grip the bar well outside shoulder-width with your core braced. Exhale to pull your chest up toward one hand while keeping the opposite arm extended straight along the bar for minimal assistance. Inhale and lower smoothly back to the dead-hang midline. Avoid dropping abruptly or bending the straight assist arm.",
  },
  "box-squats": {
    name: "Bench Box Squats",
    cue: "Squat down to lightly tap the bench or couch without plopping, knees track toes.",
    details:
      "Stand a small step in front of a low bench or couch with feet shoulder-width apart and toes turned slightly out. Inhale to sit your hips back and lower under control until you lightly tap the support without relaxing tension. Exhale and drive up evenly through your feet while keeping your knees aligned over your toes. Avoid dropping onto the seat or letting your knees cave inward.",
  },
  "air-squats": {
    name: "Air Squats",
    cue: "Heels planted, chest proud, squat smoothly to at least thigh parallel.",
    details:
      "Stand with feet slightly wider than hip-width, toes angled out, and core lightly braced. Inhale to hinge your hips back and bend your knees until thighs reach parallel while extending your arms forward for balance. Exhale and press evenly through midfoot and heels to stand tall. Avoid rounding your lower back at the bottom or lifting your heels.",
  },
  "goblet-squat": {
    name: "Goblet Squat",
    cue: "Hold weight tight at chest, guide elbows inside knees at the bottom.",
    details:
      "Cup one dumbbell or kettlebell vertically against your sternum with elbows tucked down and shoulders packed. Inhale to squat deep between your heels while guiding your elbows inside your knees to keep them tracking outward. Exhale and drive tall through your midfoot without letting your torso collapse forward. Avoid holding the weight away from your chest.",
  },
  "cossack-squat": {
    name: "Cossack Squat",
    cue: "Wide stance, sit deep onto one heel while keeping the opposite leg straight, toes up.",
    details:
      "Take a very wide stance with toes turned out 30–45°. Inhale as you shift your weight laterally and sink deep onto one side, keeping the working heel flat while extending the opposite leg straight onto its heel with toes pointing up. Exhale and press back smoothly to center. Avoid lifting the working heel or letting the knee collapse inward.",
  },
  "single-leg-bench-squat": {
    name: "Single-Leg Bench Squat",
    cue: "Lower on one leg over 3 seconds to tap bench or couch softly, knee over toes.",
    details:
      "Stand on one leg just ahead of a low bench or couch with the free leg extended forward and arms out for balance. Inhale to lower over three seconds until your hips lightly tap the surface without losing tension, keeping your knee aligned over your toes. Exhale and drive straight up on one leg without swinging. Avoid dropping down fast or letting your knee cave in.",
  },
  "split-squats": {
    name: "Static Split Squats",
    cue: "Long staggered stance, drop straight down to 90° angles without slamming the back knee.",
    details:
      "Stand in a stable split stance with feet hip-width apart like railroad tracks and the rear heel lifted. Inhale to lower straight down until your front thigh is parallel to the ground, stopping the rear knee a few centimeters above the surface. Exhale and drive up through your front heel. Avoid stepping on a tightrope or shifting forward onto the front toes.",
  },
  "bench-step-ups": {
    name: "Low-Bench Step-Ups",
    cue: "Full foot on bench, drive up through top heel without pushing off the bottom leg.",
    details:
      "Plant your entire working foot firmly on a low bench with a slight forward lean of your flat torso. Exhale to step up using only the top leg while keeping your bottom toes pulled up to prevent pushing off the ground. Inhale to lower smoothly over 2–3 seconds without letting your knee collapse inward. Avoid bouncing off the bottom foot.",
  },
  "side-lunges": {
    name: "Lateral Lunges",
    cue: "Wide step sideways while sitting hips back, keep both feet flat on the surface.",
    details:
      "Stand tall with feet together and core lightly braced. Inhale to step wide to the side while sitting your hips straight back over the stepping heel, keeping the trailing leg straight and flat. Exhale to drive powerfully back to the starting stance. Avoid shifting your knee forward over the toes without hinging your hips back.",
  },
  "skater-squats": {
    name: "Skater Squats",
    cue: "Hold rear foot off the floor behind you, lightly kiss the mat with the back knee.",
    details:
      "Balance on one leg with your free knee bent behind you and arms extended forward for counterbalance. Inhale to squat under strict control until the rear knee or shin lightly kisses your mat without resting weight. Exhale and drive upright on the standing leg. Avoid slamming the back knee down or twisting your hips.",
  },
  "suspension-pistol-squat": {
    name: "Suspension Assisted Pistol Squat",
    cue: "Use straps strictly for light balance, squat full depth on one leg with flat back.",
    details:
      "Hold the suspension handles lightly in front of you and extend one leg straight forward. Inhale to descend smoothly onto your standing heel to full comfortable depth, keeping arms relaxed so your leg does the work. Exhale and press straight back up through your midfoot. Avoid pulling yourself upright with your arms.",
  },
  "glute-bridge": {
    name: "Glute Bridge",
    cue: "Drive through your heels, pause 2 seconds squeezing glutes, zero lower-back arch.",
    details:
      "Lie on your back on the mat with knees bent, heels hip-width apart near your glutes, and ribs tucked down. Exhale to drive through your heels and raise your hips into a straight line from knees to shoulders, pausing two seconds to squeeze your glutes. Inhale smoothly back down. Avoid hyperextending your lower back above the line.",
  },
  "band-good-morning": {
    name: "Band Good Morning",
    cue: "Band under feet and across upper back, push hips straight back with a flat spine.",
    details:
      "Stand with both feet on a resistance band and loop the top across your upper traps (avoiding your neck) with knees softly unlocked. Inhale to hinge your hips straight back until your hamstrings feel a firm stretch while keeping your spine neutral. Exhale and snap your hips forward with your glutes. Avoid rounding your back or squatting.",
  },
  "db-romanian-deadlift": {
    name: "Dumbbell Romanian Deadlift",
    cue: "Keep weight brushing along thighs and shins, hinge hips back with a neutral spine.",
    details:
      "Hold a dumbbell horizontally in front of your thighs with feet hip-width apart, shoulder blades packed, and knees softly bent. Inhale to push your hips back while grazing the weight down along your legs to mid-shin depth without rounding. Exhale and squeeze your glutes to stand tall. Avoid letting the weight drift away from your legs.",
  },
  "single-leg-rdl": {
    name: "Single-Leg Romanian Deadlift",
    cue: "Keep pelvis square to the ground, move torso and back leg together as one straight lever.",
    details:
      "Balance on a softly unlocked standing leg with hips level and core braced. Inhale to hinge forward while extending your back leg straight behind you like a seesaw, keeping both hip bones pointing downward. Exhale and drive your hips forward through your standing glute to return. Avoid opening your lifted hip upward to the side.",
  },
  "nordic-curl-negatives": {
    name: "Nordic Hamstring Negatives",
    cue: "Anchor heels under couch, keep hips extended straight, resist the forward lean slowly.",
    details:
      "Kneel on a padded mat with your ankles wedged securely under a heavy couch edge and hips fully extended. Squeeze your glutes and abs tight, then inhale as you lower your straight body forward as slowly as possible using your hamstrings as brakes. Catch yourself smoothly on your hands and lightly push back up. Avoid folding at the hips.",
  },
  "dead-bug": {
    name: "Dead Bug",
    cue: "Press lower back flat into the mat, extend opposite arm and leg on a slow exhale.",
    details:
      "Lie on your back with arms reaching straight up and knees bent at 90° over your hips while pressing your lower back firmly into the mat. Exhale slowly as you extend one leg just above the floor and reach the opposite arm overhead without letting your lower back arch off the mat. Inhale to return and switch sides. Avoid letting your ribs flare.",
  },
  "bird-dog": {
    name: "Bird-Dog",
    cue: "From all fours, reach opposite arm and leg straight out to horizontal with level hips.",
    details:
      "Set up on hands and knees with wrists under shoulders, knees under hips, and a neutral spine. Exhale to reach one arm forward and the opposite leg straight back to hip height, pausing one second without arching your lower back or rotating your pelvis. Inhale to return smoothly. Avoid kicking the heel above hip height or twisting.",
  },
  "high-plank": {
    name: "High Straight-Arm Plank",
    cue: "Straight-arm support on bench or mat, tuck tailbone slightly, squeeze glutes and abs.",
    details:
      "Place your hands directly beneath your shoulders on a mat or low bench with feet back on your toes and elbows locked softly. Slightly tuck your pelvis, squeeze glutes and abs, and push the support away gently through your shoulder blades. Breathe evenly throughout the hold. Avoid letting your lower back sag or your shoulder blades collapse together.",
  },
  "hanging-knee-raises": {
    name: "Hanging Knee Raises",
    cue: "Curl your pelvis up toward your chest on the exhale, lower with zero bar swinging.",
    details:
      "Hang from a pull-up bar (or against stall bars for extra stability) with shoulders slightly engaged away from your ears. Exhale to lift your knees past hip height while actively curling your tailbone upward so your abs drive the motion. Inhale to lower smoothly without swinging. Avoid stopping at hip level or using momentum.",
  },
  "hollow-body-hold": {
    name: "Hollow Body Hold",
    cue: "Shoulder blades and straight legs hovering, lower back glued firmly to the mat.",
    details:
      "Lie supine on your mat and press your lower back flush into the floor by drawing your ribs toward your pelvis. Lift your shoulder blades and straight legs together into a shallow banana shape, adjusting leg height so your lower back never peels off the mat. Keep breathing smoothly throughout the hold. Avoid lowering your legs past the point of lower-back control.",
  },
  "suspension-fallout": {
    name: "Standing Suspension Fallout",
    cue: "Standing plank in straps, extend arms overhead while bracing abs with zero spine sag.",
    details:
      "Stand on your toes facing away from the anchor with handles held in front of your shoulders in an angled plank. Inhale to reach your straight arms forward overhead while squeezing glutes and abs hard to prevent your lower back from arching. Exhale to pull your arms back under your shoulders. Avoid letting your hips drop as your arms reach out.",
  },
  "hanging-leg-raises": {
    name: "Hanging Straight-Leg Raises",
    cue: "Straight legs in a controlled hang, lift toes up on the exhale with zero swinging.",
    details:
      "Hang from a pull-up bar (or supported against stall bars) with knees locked straight and shoulders lightly packed. Exhale to raise your straight legs smoothly to hip height or higher toward the bar by curling your pelvis upward. Inhale to lower over two seconds under full control. Avoid dropping your legs fast or bending your knees.",
  },
  "l-sit-hold": {
    name: "Parallel Bar L-Sit Hold",
    cue: "Strong dip-bar support with shoulders pressed down, hold straight legs horizontal.",
    details:
      "Press into a straight-arm support on parallel bars, driving your shoulders firmly down away from your ears. Brace your abs and squeeze your quads to hold both straight legs horizontal at a 90° angle to your torso. Breathe in steady shallow cycles throughout the hold. Avoid shrugging into your shoulders or letting your heels dip below horizontal.",
  },
  "suitcase-march": {
    name: "Single-Arm Suitcase March",
    cue: "Hold dumbbell in one hand at your side, march steadily with completely level shoulders.",
    details:
      "Hold a dumbbell in one hand slightly clear of your hip while keeping your spine tall and both shoulders completely level. March slowly in place by lifting each knee to hip height for a one-second pause without leaning toward or away from the weight. Breathe evenly throughout. Avoid dipping your loaded shoulder or rushing the steps.",
  },
  "copenhagen-plank-short": {
    name: "Short-Lever Copenhagen Plank",
    cue: "Side forearm plank with top bent knee resting on couch, hold a crisp straight hip line.",
    details:
      "Set into a side plank on your forearm beside a couch, elbow directly under your shoulder, resting the inside of your bent top knee on the cushion while lifting the bottom leg off the mat. Press your hips into a straight horizontal line without twisting. Breathe steadily throughout the hold. Avoid letting your hips drop or your top shoulder roll forward.",
  },
  "swedish-wall-side-hold": {
    name: "Swedish Wall Side Tuck Hold",
    cue: "Sideways on stall bars: top hand pulls, bottom straight arm pushes, hold tucked hips level.",
    details:
      "Stand sideways to the stall bars, grip an overhead rung with your top hand and press your straight bottom arm firmly against a hip-level rung. Lift your feet with knees tucked toward your chest to hold your torso horizontal sideways without twisting. Keep breathing evenly throughout the hold. Avoid bending the bottom pushing elbow.",
  },
  "plank-shoulder-taps": {
    name: "Plank Shoulder Taps",
    cue: "Feet slightly wide, slowly tap the opposite shoulder on exhale with zero hip sway.",
    details:
      "Set into a straight-arm plank on a mat or low bench with feet slightly wider than shoulder-width for stability. Exhale to brace your core and lift one hand to tap your opposite shoulder for a one-second pause while keeping hips completely still. Inhale to place the hand softly and alternate. Avoid rocking your pelvis side to side.",
  },
  "split-stance-band-anti-rotation": {
    name: "Split-Stance Band Anti-Rotation Hold",
    cue: "Low athletic split stance sideways to post, hold straight arms centered against pull.",
    details:
      "Anchor the band to a stall bar at chest height, step out sideways into a low staggered split stance with knees softly bent, and create strong tension. Press your arms straight out along the midline of your chest and hold firm against rotational pull, optionally adding small controlled pulses. Keep breathing evenly. Avoid letting your hands drift toward the anchor.",
  },
};
